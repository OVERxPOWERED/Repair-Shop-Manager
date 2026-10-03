from django.urls import path

from .cron import CronView
from .views import HealthCheckView

app_name = "core"

urlpatterns = [
    path("health/", HealthCheckView.as_view(), name="health-check"),
    path("internal/cron/<slug:job>/", CronView.as_view(), name="cron-job"),
]
