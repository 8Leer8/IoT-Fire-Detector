import requests
import threading
import time
from datetime import timedelta
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import DeviceToken, FireAlert, SensorStatus
from .serializers import FireAlertSerializer


EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
REPEAT_PUSH_INTERVAL_SECONDS = 12
APP_OPEN_STOP_WINDOW_SECONDS = 40
DEFAULT_ALERT_CHANNEL = 'mixkit_urgent_simple_tone_loop_2976'
ALLOWED_NOTIFICATION_CHANNELS = {
	'default',
	'mixkit_urgent_simple_tone_loop_2976',
	'mixkit_access_allowed_tone_2869',
	'mixkit_bell_notification_933',
	'mixkit_clear_announce_tones_2861',
	'mixkit_game_notification_wave_alarm_987',
	'mixkit_happy_bells_notification_937',
}


def _normalize_channel_id(channel_id: str) -> str:
	if channel_id in ALLOWED_NOTIFICATION_CHANNELS:
		return channel_id
	return DEFAULT_ALERT_CHANNEL


def _send_fire_push_once(stall_label: str, alert_body: str):
	for device_token in DeviceToken.objects.all():
		channel_id = _normalize_channel_id(device_token.notification_channel or DEFAULT_ALERT_CHANNEL)
		sound_name = f'{channel_id}.wav' if channel_id != 'default' else 'default'
		payload = {
			'to': device_token.token,
			'title': f'Fire Detected - {stall_label}',
			'body': alert_body,
			'sound': sound_name,
			'channelId': channel_id,
			'priority': 'high',
		}
		try:
			response = requests.post(
				EXPO_PUSH_URL,
				json=payload,
				headers={
					'Content-Type': 'application/json',
					'Accept': 'application/json',
				},
				timeout=10,
			)

			print(f"[ExpoPush] token={device_token.token} status={response.status_code} body={response.text}")
			try:
				result = response.json()
			except ValueError:
				print(f"[ExpoPush] non-JSON response: {response.text}")
				continue

			data = result.get('data')
			if isinstance(data, dict) and data.get('status') == 'error':
				error_code = data.get('details', {}).get('error')
				print(f"[ExpoPush] error token={device_token.token} details={data}")
				if error_code == 'DeviceNotRegistered':
					device_token.delete()
			elif isinstance(data, list):
				for ticket in data:
					if ticket.get('status') == 'error':
						error_code = ticket.get('details', {}).get('error')
						print(f"[ExpoPush] error token={device_token.token} details={ticket}")
						if error_code == 'DeviceNotRegistered':
							device_token.delete()
		except requests.RequestException:
			print(f"[ExpoPush] request failed for token={device_token.token}")
			continue


def _is_fire_alert_active(alert_id: int) -> bool:
	try:
		alert = FireAlert.objects.get(id=alert_id)
		return alert.status == FireAlert.STATUS_FIRE and not alert.resolved
	except FireAlert.DoesNotExist:
		return False


def _has_recent_app_open() -> bool:
	recent_threshold = timezone.now() - timedelta(seconds=APP_OPEN_STOP_WINDOW_SECONDS)
	return DeviceToken.objects.filter(last_seen_at__gte=recent_threshold).exists()


def _repeat_fire_push_until_resolved(alert_id: int, stall_label: str, alert_body: str):
	while _is_fire_alert_active(alert_id):
		if _has_recent_app_open():
			break
		time.sleep(REPEAT_PUSH_INTERVAL_SECONDS)
		if not _is_fire_alert_active(alert_id) or _has_recent_app_open():
			break
		_send_fire_push_once(stall_label=stall_label, alert_body=alert_body)


class RegisterTokenView(APIView):
	def post(self, request):
		token = request.data.get('token')
		channel_id = request.data.get('channel_id') or request.data.get('tone') or DEFAULT_ALERT_CHANNEL
		channel_id = _normalize_channel_id(channel_id)

		if not token:
			return Response({'message': 'Token is required'}, status=status.HTTP_400_BAD_REQUEST)

		device_token, _ = DeviceToken.objects.get_or_create(token=token)
		fields_to_update = ['last_seen_at']
		device_token.last_seen_at = timezone.now()
		if device_token.notification_channel != channel_id:
			device_token.notification_channel = channel_id
			fields_to_update.append('notification_channel')

		device_token.save(update_fields=fields_to_update)
		return Response({'message': 'Token registered'}, status=status.HTTP_200_OK)


class LatestStatusView(APIView):
	def get(self, request):
		try:
			latest_alert = FireAlert.objects.latest('triggered_at')
			serializer = FireAlertSerializer(latest_alert)
			return Response(serializer.data, status=status.HTTP_200_OK)
		except FireAlert.DoesNotExist:
			return Response(
				{
					'id': None,
					'status': 'normal',
					'stall': None,
					'resolved': True,
					'resolved_at': None,
					'message': 'No alerts yet',
					'triggered_at': None,
				},
				status=status.HTTP_200_OK,
			)


class AlertListView(APIView):
	def get(self, request):
		alerts = FireAlert.objects.order_by('-triggered_at')
		serializer = FireAlertSerializer(alerts, many=True)
		return Response(serializer.data, status=status.HTTP_200_OK)


class FireAlertView(APIView):
	def post(self, request):
		status_value = request.data.get('status')
		stall_value = request.data.get('stall', FireAlert.STALL_1)
		message = request.data.get('message', '')
		had_active_fire_before = FireAlert.objects.filter(
			status=FireAlert.STATUS_FIRE,
			resolved=False,
		).exists()

		if status_value not in [FireAlert.STATUS_FIRE, FireAlert.STATUS_NORMAL]:
			return Response(
				{'message': "Invalid status. Use 'fire' or 'normal'."},
				status=status.HTTP_400_BAD_REQUEST,
			)

		if stall_value not in [FireAlert.STALL_1, FireAlert.STALL_2, FireAlert.STALL_BOTH]:
			return Response(
				{'message': "Invalid stall. Use 'stall_1', 'stall_2', or 'both'."},
				status=status.HTTP_400_BAD_REQUEST,
			)

		new_alert = FireAlert.objects.create(status=status_value, stall=stall_value, message=message)

		if status_value == FireAlert.STATUS_FIRE:
			stall_label = {
				FireAlert.STALL_1: 'Stall 1',
				FireAlert.STALL_2: 'Stall 2',
				FireAlert.STALL_BOTH: 'Both Stalls',
			}.get(stall_value, 'Unknown Stall')
			alert_body = message.strip() if message else ''
			if not alert_body:
				alert_body = f'Fire detected in {stall_label}. Take action immediately.'

			_send_fire_push_once(stall_label=stall_label, alert_body=alert_body)

			if not had_active_fire_before:
				threading.Thread(
					target=_repeat_fire_push_until_resolved,
					args=(new_alert.id, stall_label, alert_body),
					daemon=True,
				).start()

		return Response({'message': 'Alert saved'}, status=status.HTTP_201_CREATED)


class ResolveAlertView(APIView):
	def post(self, request, id):
		get_object_or_404(FireAlert, id=id)
		resolved_at = timezone.now()
		FireAlert.objects.filter(status=FireAlert.STATUS_FIRE, resolved=False).update(
			resolved=True,
			resolved_at=resolved_at,
		)

		return Response({'message': 'Alert resolved'}, status=status.HTTP_200_OK)


class SensorStatusView(APIView):
	def post(self, request):
		online = request.data.get('online')

		if online is not True:
			return Response({'message': 'online=true is required'}, status=status.HTTP_400_BAD_REQUEST)

		sensor_status, _ = SensorStatus.objects.get_or_create(id=1)
		sensor_status.is_online = True
		sensor_status.save()

		return Response({'message': 'Status updated'}, status=status.HTTP_200_OK)


class GetSensorStatusView(APIView):
	def get(self, request):
		sensor_status, _ = SensorStatus.objects.get_or_create(id=1)

		if timezone.now() - sensor_status.last_seen > timedelta(seconds=30):
			sensor_status.is_online = False
			sensor_status.save(update_fields=['is_online', 'last_seen'])

		return Response(
			{
				'is_online': sensor_status.is_online,
				'last_seen': sensor_status.last_seen,
			},
			status=status.HTTP_200_OK,
		)
