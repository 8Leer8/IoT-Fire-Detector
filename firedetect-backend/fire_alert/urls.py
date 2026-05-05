from django.urls import path
from .views import (
    AlertListView,
    CheckResolvedView,
    FireAlertView,
    LatestStatusView,
    ResolveAlertView,
    RegisterTokenView,
    SensorStatusView,
)

urlpatterns = [
    path('register-token/', RegisterTokenView.as_view(), name='register-token'),
    path('latest-status/', LatestStatusView.as_view(), name='latest-status'),
    path('check-resolved/', CheckResolvedView.as_view(), name='check-resolved'),
    path('alerts/', AlertListView.as_view(), name='alerts'),
    path('alerts/<int:id>/resolve/', ResolveAlertView.as_view(), name='resolve-alert'),
    path('fire-alert/', FireAlertView.as_view(), name='fire-alert'),
    path('sensor-status/', SensorStatusView.as_view(), name='sensor-status'),
]
