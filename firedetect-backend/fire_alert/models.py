from django.db import models


class DeviceToken(models.Model):
	token = models.CharField(max_length=255, unique=True)
	notification_channel = models.CharField(max_length=120, default='default')
	created_at = models.DateTimeField(auto_now_add=True)

	def __str__(self):
		return self.token


class FireAlert(models.Model):
	STATUS_FIRE = 'fire'
	STATUS_NORMAL = 'normal'
	STATUS_CHOICES = [
		(STATUS_FIRE, 'Fire'),
		(STATUS_NORMAL, 'Normal'),
	]
	STALL_1 = 'stall_1'
	STALL_2 = 'stall_2'
	STALL_BOTH = 'both'
	STALL_CHOICES = [
		(STALL_1, 'Stall 1'),
		(STALL_2, 'Stall 2'),
		(STALL_BOTH, 'Both'),
	]

	status = models.CharField(max_length=10, choices=STATUS_CHOICES)
	stall = models.CharField(max_length=10, choices=STALL_CHOICES, default=STALL_1)
	resolved = models.BooleanField(default=False)
	resolved_at = models.DateTimeField(null=True, blank=True)
	triggered_at = models.DateTimeField(auto_now_add=True)
	message = models.CharField(max_length=255, blank=True)

	def __str__(self):
		return f"{self.status} @ {self.triggered_at}"


class SensorStatus(models.Model):
	is_online = models.BooleanField(default=False)
	last_seen = models.DateTimeField(auto_now=True)

	class Meta:
		verbose_name = "Sensor Status"
