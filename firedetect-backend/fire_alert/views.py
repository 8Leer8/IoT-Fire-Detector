import requests
import threading
import time
from datetime import timedelta
from django.utils import timezone
from rest_framework import permissions
from rest_framework.authentication import SessionAuthentication
from rest_framework.parsers import FormParser, JSONParser
from rest_framework import status
from rest_framework.response import Response
from django.http import HttpResponse
import json
from rest_framework.views import APIView

from .models import DeviceToken, FireAlert, SensorStatus
from .serializers import (
	FireAlertIngestSerializer,
	FireAlertSerializer,
	SensorStatusIngestSerializer,
)


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
		return (
			alert.status == FireAlert.STATUS_FIRE
			and not alert.resolved
			and (alert.stall_1_active or alert.stall_2_active)
		)
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
	authentication_classes = []
	permission_classes = [permissions.AllowAny]
	parser_classes = [JSONParser, FormParser]

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
			latest_unresolved = FireAlert.objects.filter(
				status=FireAlert.STATUS_FIRE,
				resolved=False,
			).order_by('-triggered_at').first()
			latest_alert = latest_unresolved or FireAlert.objects.latest('triggered_at')
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


class CheckResolvedView(APIView):
	def get(self, request):
		active_incident = FireAlert.objects.filter(is_active=True).first()
		if not active_incident:
			payload = {
				'stall1_resolved': True,
				'stall2_resolved': True,
			}
			return HttpResponse(
				json.dumps(payload, separators=(',', ':')),
				content_type='application/json',
				status=status.HTTP_200_OK,
			)

		payload = {
			'stall1_resolved': active_incident.stall_1_resolved,
			'stall2_resolved': active_incident.stall_2_resolved,
		}
		return HttpResponse(
			json.dumps(payload, separators=(',', ':')),
			content_type='application/json',
			status=status.HTTP_200_OK,
		)


class AlertListView(APIView):
	def get(self, request):
		alerts = FireAlert.objects.order_by('-triggered_at')
		serializer = FireAlertSerializer(alerts, many=True)
		return Response(serializer.data, status=status.HTTP_200_OK)


class FireAlertView(APIView):
	authentication_classes = []
	permission_classes = [permissions.AllowAny]
	parser_classes = [JSONParser, FormParser]

	def post(self, request):
		serializer = FireAlertIngestSerializer(data=request.data)
		if not serializer.is_valid():
			return Response(
				{
					'status': 'error',
					'message': 'Invalid fire alert payload',
					'errors': serializer.errors,
				},
				status=status.HTTP_400_BAD_REQUEST,
			)

		validated = serializer.validated_data
		incoming_status = validated['status']
		status_value = (
			FireAlert.STATUS_FIRE if incoming_status in {'ACTIVE', 'FIRE'} else FireAlert.STATUS_NORMAL
		)
		location = validated['location']
		message = validated.get('message', '').strip()

		stall_value = FireAlert.STALL_1
		if location == 'STALL 2':
			stall_value = FireAlert.STALL_2
		elif location in {'BOTH', 'BOTH STALLS'}:
			stall_value = FireAlert.STALL_BOTH

		if stall_value == FireAlert.STALL_1:
			stall_1_active = True
			stall_2_active = False
		elif stall_value == FireAlert.STALL_2:
			stall_1_active = False
			stall_2_active = True
		else:
			stall_1_active = True
			stall_2_active = True

		if status_value == FireAlert.STATUS_NORMAL:
			active_incident = FireAlert.objects.filter(is_active=True).first()
			if active_incident:
				active_incident.is_active = False
				active_incident.save(update_fields=['is_active'])
			return Response(
				{
					'status': 'success',
					'message': 'Normal status received',
					'fire_status': status_value,
					'stall': stall_value,
				},
				status=status.HTTP_200_OK,
			)

		active_incident = FireAlert.objects.filter(is_active=True).first()
		is_new_incident = active_incident is None

		if active_incident:
			active_incident.stall = stall_value
			active_incident.stall_1_active = stall_1_active
			active_incident.stall_2_active = stall_2_active
			active_incident.message = message
			active_incident.save(update_fields=['stall', 'stall_1_active', 'stall_2_active', 'message'])
			new_alert = active_incident
		else:
			new_alert = FireAlert.objects.create(
				status=status_value,
				stall=stall_value,
				message=message,
				is_active=True,
				stall_1_active=stall_1_active,
				stall_2_active=stall_2_active,
			)

		if status_value == FireAlert.STATUS_FIRE and is_new_incident:
			stall_label = {
				FireAlert.STALL_1: 'Stall 1',
				FireAlert.STALL_2: 'Stall 2',
				FireAlert.STALL_BOTH: 'Both Stalls',
			}.get(stall_value, 'Unknown Stall')
			alert_body = message.strip() if message else ''
			if not alert_body:
				alert_body = f'Fire detected in {stall_label}. Take action immediately.'

			_send_fire_push_once(stall_label=stall_label, alert_body=alert_body)

			threading.Thread(
				target=_repeat_fire_push_until_resolved,
				args=(new_alert.id, stall_label, alert_body),
				daemon=True,
			).start()

		return Response(
			{
				'status': 'success',
				'message': 'Fire alert accepted',
				'alert_id': new_alert.id,
				'fire_status': status_value,
				'stall': stall_value,
			},
			status=status.HTTP_201_CREATED,
		)


class FireAlertResolveView(APIView):
	authentication_classes = []
	permission_classes = [permissions.AllowAny]
	parser_classes = [JSONParser, FormParser]

	def post(self, request):
		stall = request.data.get('stall')
		if stall not in {'stall_1', 'stall_2', 'both'}:
			return Response(
				{'message': 'stall must be one of: stall_1, stall_2, both'},
				status=status.HTTP_400_BAD_REQUEST,
			)

		active_incident = FireAlert.objects.filter(is_active=True).first()
		if not active_incident:
			return Response({'message': 'No active incident'}, status=status.HTTP_404_NOT_FOUND)

		fields_to_update = []
		if stall in {'stall_1', 'both'} and not active_incident.stall_1_resolved:
			active_incident.stall_1_resolved = True
			fields_to_update.append('stall_1_resolved')
		if stall in {'stall_2', 'both'} and not active_incident.stall_2_resolved:
			active_incident.stall_2_resolved = True
			fields_to_update.append('stall_2_resolved')

		if active_incident.stall_1_resolved and active_incident.stall_2_resolved:
			active_incident.resolved = True
			active_incident.is_active = False
			active_incident.resolved_at = timezone.now()
			fields_to_update.extend(['resolved', 'is_active', 'resolved_at'])

		if fields_to_update:
			active_incident.save(update_fields=list(set(fields_to_update)))
		serializer = FireAlertSerializer(active_incident)
		return Response(serializer.data, status=status.HTTP_200_OK)


class SensorStatusView(APIView):
	authentication_classes = []
	permission_classes = [permissions.AllowAny]
	parser_classes = [JSONParser, FormParser]

	def post(self, request):
		serializer = SensorStatusIngestSerializer(data=request.data)
		if not serializer.is_valid():
			return Response(
				{
					'status': 'error',
					'message': 'Invalid sensor status payload',
					'errors': serializer.errors,
				},
				status=status.HTTP_400_BAD_REQUEST,
			)

		stall1 = serializer.validated_data['stall1']
		stall2 = serializer.validated_data['stall2']

		sensor_status, _ = SensorStatus.objects.get_or_create(id=1)
		sensor_status.is_online = True
		sensor_status.stall1 = stall1
		sensor_status.stall2 = stall2
		sensor_status.save()

		return Response(
			{
				'status': 'success',
				'message': 'Sensor status accepted',
				'data': {
					'stall1': sensor_status.stall1,
					'stall2': sensor_status.stall2,
					'is_online': sensor_status.is_online,
					'last_seen': sensor_status.last_seen,
				},
			},
			status=status.HTTP_200_OK,
		)

	def get(self, request):
		sensor_status, _ = SensorStatus.objects.get_or_create(id=1)

		if timezone.now() - sensor_status.last_seen > timedelta(seconds=30):
			sensor_status.is_online = False
			sensor_status.save(update_fields=['is_online', 'last_seen'])

		return Response(
			{
				'status': 'success',
				'message': 'Sensor status fetched',
				'stall1': sensor_status.stall1,
				'stall2': sensor_status.stall2,
				'is_online': sensor_status.is_online,
				'last_seen': sensor_status.last_seen,
			},
			status=status.HTTP_200_OK,
		)
