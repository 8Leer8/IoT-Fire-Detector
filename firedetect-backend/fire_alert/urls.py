from django.urls import path
from .views import (
    AlertListView,
    CheckResolvedView,
    FireAlertView,
    FireAlertResolveView,
    LatestStatusView,
    RegisterTokenView,
    SensorStatusView,
)

urlpatterns = [
    path('register-token/', RegisterTokenView.as_view(), name='register-token'),
    path('latest-status/', LatestStatusView.as_view(), name='latest-status'),
    path('check-resolved/', CheckResolvedView.as_view(), name='check-resolved'),
    path('alerts/', AlertListView.as_view(), name='alerts'),
    path('fire-alert/', FireAlertView.as_view(), name='fire-alert'),
    path('fire-alert/resolve/', FireAlertResolveView.as_view(), name='fire-alert-resolve'),
    path('sensor-status/', SensorStatusView.as_view(), name='sensor-status'),
]
