from rest_framework import serializers
from .models import DeviceToken, FireAlert, SensorStatus


class DeviceTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeviceToken
        fields = '__all__'


class FireAlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = FireAlert
        fields = [
            'id',
            'status',
            'stall',
            'stall_1_active',
            'stall_2_active',
            'stall_1_resolved',
            'stall_2_resolved',
            'is_active',
            'resolved',
            'resolved_at',
            'triggered_at',
            'message',
        ]


class FireAlertIngestSerializer(serializers.Serializer):
    STALL_CHOICES = ('stall_1', 'stall_2', 'both')

    status  = serializers.CharField(required=True, allow_blank=False)
    stall   = serializers.ChoiceField(choices=STALL_CHOICES, required=False, default='stall_1')
    message = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_status(self, value):
        normalized = str(value).strip().upper()
        allowed = {'ACTIVE', 'INACTIVE', 'FIRE', 'NORMAL'}
        if normalized not in allowed:
            raise serializers.ValidationError(
                "status must be one of: ACTIVE, INACTIVE, FIRE, NORMAL"
            )
        return normalized


class SensorStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = SensorStatus
        fields = '__all__'


class SensorStatusIngestSerializer(serializers.Serializer):
    stall1 = serializers.BooleanField(required=True)
    stall2 = serializers.BooleanField(required=True)