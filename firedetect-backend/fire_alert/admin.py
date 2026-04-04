from django.contrib import admin
from .models import DeviceToken, FireAlert, SensorStatus

admin.site.register(DeviceToken)
admin.site.register(FireAlert)
admin.site.register(SensorStatus)
