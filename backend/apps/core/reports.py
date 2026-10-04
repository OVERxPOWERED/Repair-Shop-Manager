from datetime import datetime

from django.db.models import Count, Sum
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.billing.models import Invoice, Payment
from apps.core.time import IST, today_ist
from apps.jobs.models import Job, JobStatus
from apps.tenancy.viewsets import ShopScopedAPIView


def parse_report_date_range(request):
    from_str = request.query_params.get("from")
    to_str = request.query_params.get("to")
    today = today_ist()

    if from_str:
        try:
            from_date = datetime.strptime(from_str, "%Y-%m-%d").date()
        except ValueError as err:
            raise ValidationError("Invalid 'from' date format. Use YYYY-MM-DD.") from err
    else:
        # Default to start of current month
        from_date = today.replace(day=1)

    if to_str:
        try:
            to_date = datetime.strptime(to_str, "%Y-%m-%d").date()
        except ValueError as err:
            raise ValidationError("Invalid 'to' date format. Use YYYY-MM-DD.") from err
    else:
        to_date = today

    if to_date < from_date:
        raise ValidationError("'to' date cannot be earlier than 'from' date.")
    if (to_date - from_date).days > 366:
        raise ValidationError("Date range cannot exceed 366 days.")

    return from_date, to_date


class ReportsSummaryView(ShopScopedAPIView):
    """GET /reports/summary/?from=YYYY-MM-DD&to=YYYY-MM-DD (permission: reports.view_basic)."""

    http_method_names = ["get", "head", "options"]
    permission_map = {"get": "reports.view_basic"}

    def get(self, request):
        from_date, to_date = parse_report_date_range(request)

        # Datetime boundaries in IST
        start_dt = datetime.combine(from_date, datetime.min.time(), tzinfo=IST)
        end_dt = datetime.combine(to_date, datetime.max.time(), tzinfo=IST)

        shop = request.shop

        # 1. Jobs summary
        received_count = Job.objects.filter(
            shop=shop,
            received_at__gte=start_dt,
            received_at__lte=end_dt,
            deleted_at__isnull=True,
        ).count()

        delivered_count = Job.objects.filter(
            shop=shop,
            delivered_at__gte=start_dt,
            delivered_at__lte=end_dt,
            deleted_at__isnull=True,
        ).count()

        status_counts = {choice[0]: 0 for choice in JobStatus.choices}
        status_aggs = (
            Job.objects.filter(
                shop=shop,
                received_at__gte=start_dt,
                received_at__lte=end_dt,
                deleted_at__isnull=True,
            )
            .values("status")
            .annotate(c=Count("id"))
        )
        for row in status_aggs:
            status_counts[row["status"]] = row["c"]

        # 2. Collections summary
        in_payments = Payment.objects.filter(
            shop=shop,
            direction=Payment.Direction.IN,
            received_at__gte=start_dt,
            received_at__lte=end_dt,
            deleted_at__isnull=True,
        )
        by_mode = {"cash": 0, "upi": 0, "card": 0, "bank": 0}
        mode_aggs = in_payments.values("mode").annotate(total=Sum("amount_paise"))
        total_in_paise = 0
        for row in mode_aggs:
            m = row["mode"]
            t = row["total"] or 0
            if m in by_mode:
                by_mode[m] = t
            total_in_paise += t

        out_aggs = Payment.objects.filter(
            shop=shop,
            direction=Payment.Direction.OUT,
            received_at__gte=start_dt,
            received_at__lte=end_dt,
            deleted_at__isnull=True,
        ).aggregate(total=Sum("amount_paise"))
        refunds_paise = out_aggs["total"] or 0

        # 3. Revenue summary
        inv_qs = Invoice.objects.filter(
            shop=shop,
            status=Invoice.Status.ISSUED,
            issue_date__gte=from_date,
            issue_date__lte=to_date,
            deleted_at__isnull=True,
        )
        invoiced_paise = inv_qs.exclude(kind=Invoice.Kind.CREDIT_NOTE).aggregate(total=Sum("total_paise"))["total"] or 0
        credit_notes_paise = (
            inv_qs.filter(kind=Invoice.Kind.CREDIT_NOTE).aggregate(total=Sum("total_paise"))["total"] or 0
        )
        net_paise = invoiced_paise - credit_notes_paise

        payload = {
            "jobs": {
                "received": received_count,
                "delivered": delivered_count,
                "by_status": status_counts,
            },
            "collections": {
                "total_paise": total_in_paise,
                "by_mode": by_mode,
                "refunds_paise": refunds_paise,
            },
            "revenue": {
                "invoiced_paise": invoiced_paise,
                "credit_notes_paise": credit_notes_paise,
                "net_paise": net_paise,
            },
        }

        # 4. Profit summary (permission: reports.view_profit)
        if request.membership.has_perm("reports.view_profit"):
            delivered_jobs = Job.objects.filter(
                shop=shop,
                status=JobStatus.DELIVERED,
                delivered_at__gte=start_dt,
                delivered_at__lte=end_dt,
                deleted_at__isnull=True,
            ).aggregate(
                cost=Sum("cost_paise"),
                total=Sum("total_paise"),
            )
            parts_cost_paise = delivered_jobs["cost"] or 0
            delivered_total_paise = delivered_jobs["total"] or 0
            gross_profit_paise = delivered_total_paise - parts_cost_paise
            payload["profit"] = {
                "parts_cost_paise": parts_cost_paise,
                "gross_profit_paise": gross_profit_paise,
            }

        return Response(payload)
