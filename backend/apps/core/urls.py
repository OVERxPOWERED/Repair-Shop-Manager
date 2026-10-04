from django.urls import path

from .cron import CronView
from .exports import (
    CustomerExportView,
    InvoiceExportView,
    JobExportView,
    PaymentExportView,
)
from .reports import ReportsSummaryView
from .views import HealthCheckView

app_name = "core"

urlpatterns = [
    path("health/", HealthCheckView.as_view(), name="health-check"),
    path("internal/cron/<slug:job>/", CronView.as_view(), name="cron-job"),
    path("reports/summary/", ReportsSummaryView.as_view(), name="reports-summary"),
    path("exports/customers.xlsx", CustomerExportView.as_view(), name="export-customers"),
    path("exports/jobs.xlsx", JobExportView.as_view(), name="export-jobs"),
    path("exports/invoices.xlsx", InvoiceExportView.as_view(), name="export-invoices"),
    path("exports/payments.xlsx", PaymentExportView.as_view(), name="export-payments"),
]
