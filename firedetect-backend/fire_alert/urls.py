from django.http import HttpResponseNotAllowed
from django.urls import path
from .views import (
    AlertListView,
    FireAlertView,
    GetSensorStatusView,
    LatestStatusView,
    ResolveAlertView,
    RegisterTokenView,
    SensorStatusView,
)

sensor_status_post_view = SensorStatusView.as_view()
sensor_status_get_view = GetSensorStatusView.as_view()


def sensor_status_method_router(request, *args, **kwargs):
    if request.method == 'POST':
        return sensor_status_post_view(request, *args, **kwargs)
    if request.method == 'GET':
        return sensor_status_get_view(request, *args, **kwargs)
    return HttpResponseNotAllowed(['GET', 'POST'])

urlpatterns = [
    path('register-token/', RegisterTokenView.as_view(), name='register-token'),
    path('latest-status/', LatestStatusView.as_view(), name='latest-status'),
    path('alerts/', AlertListView.as_view(), name='alerts'),
    path('alerts/<int:id>/resolve/', ResolveAlertView.as_view(), name='resolve-alert'),
    path('fire-alert/', FireAlertView.as_view(), name='fire-alert'),
    path('sensor-status/', sensor_status_method_router, name='sensor-status'),
]
