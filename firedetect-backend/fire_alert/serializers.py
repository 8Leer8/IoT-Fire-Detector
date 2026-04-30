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


class FireAlertIngestSerializer(serializers.Serializer):
    location = serializers.CharField(required=False, allow_blank=False)
    status = serializers.CharField(required=True, allow_blank=False)
    message = serializers.CharField(required=False, allow_blank=True, default='')
    stall = serializers.CharField(required=False, allow_blank=False)

    def validate_status(self, value):
        normalized = str(value).strip().upper()
        allowed = {'ACTIVE', 'INACTIVE', 'FIRE', 'NORMAL'}
        if normalized not in allowed:
            raise serializers.ValidationError("status must be one of: ACTIVE, INACTIVE, FIRE, NORMAL")
        return normalized

    def validate(self, attrs):
        location = attrs.get('location') or attrs.get('stall')
        if not location:
            raise serializers.ValidationError({'location': 'location is required (example: STALL 1).'})

        normalized_location = str(location).strip().upper().replace('-', ' ').replace('_', ' ')
        valid_locations = {'STALL 1', 'STALL 2', 'BOTH', 'BOTH STALLS'}
        if normalized_location not in valid_locations:
            raise serializers.ValidationError(
                {'location': "location must be one of: STALL 1, STALL 2, BOTH"}
            )

        attrs['location'] = normalized_location
        return attrs


class SensorStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = SensorStatus
        fields = '__all__'


class SensorStatusIngestSerializer(serializers.Serializer):
    stall1 = serializers.BooleanField(required=True)
    stall2 = serializers.BooleanField(required=True)
