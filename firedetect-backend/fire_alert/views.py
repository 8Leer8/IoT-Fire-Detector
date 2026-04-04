import requests
from datetime import timedelta
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import DeviceToken, FireAlert, SensorStatus
from .serializers import FireAlertSerializer


class RegisterTokenView(APIView):
	def post(self, request):
		token = request.data.get('token')

		if not token:
			return Response({'message': 'Token is required'}, status=status.HTTP_400_BAD_REQUEST)

		DeviceToken.objects.get_or_create(token=token)
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

		FireAlert.objects.create(status=status_value, stall=stall_value, message=message)

		if status_value == FireAlert.STATUS_FIRE:
			stall_label = {
				FireAlert.STALL_1: 'Stall 1',
				FireAlert.STALL_2: 'Stall 2',
				FireAlert.STALL_BOTH: 'Both Stalls',
			}.get(stall_value, 'Unknown Stall')
			alert_body = message.strip() if message else ''
			if not alert_body:
				alert_body = f'Fire detected in {stall_label}. Take action immediately.'

			for device_token in DeviceToken.objects.all():
				payload = {
					'to': device_token.token,
					'title': f'Fire Detected - {stall_label}',
					'body': alert_body,
					'sound': 'default',
					'priority': 'high',
				}
				try:
					response = requests.post(
						'https://exp.host/--/api/v2/push/send',
						json=payload,
						headers={
							'Content-Type': 'application/json',
							'Accept': 'application/json',
						},
						timeout=10,
					)

					print(f"[ExpoPush] token={device_token.token} status={response.status_code}")
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

		return Response({'message': 'Alert saved'}, status=status.HTTP_201_CREATED)


class ResolveAlertView(APIView):
	def post(self, request, id):
		alert = get_object_or_404(FireAlert, id=id)
		alert.resolved = True
		alert.resolved_at = timezone.now()
		alert.save(update_fields=['resolved', 'resolved_at'])

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
