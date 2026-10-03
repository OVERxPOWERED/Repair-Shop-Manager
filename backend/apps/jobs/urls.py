from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.jobs.views import DashboardSummaryView, JobViewSet

router = DefaultRouter()
router.register("jobs", JobViewSet, basename="job")

urlpatterns = [
    path("dashboard/summary/", DashboardSummaryView.as_view(), name="dashboard-summary"),
] + router.urls
