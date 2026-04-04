from rest_framework import serializers

from .models import DeviceToken, FireAlert, SensorStatus


class DeviceTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeviceToken
        fields = '__all__'


class FireAlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = FireAlert
        fields = ['id', 'status', 'stall', 'resolved', 'resolved_at', 'triggered_at', 'message']


class SensorStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = SensorStatus
        fields = '__all__'
