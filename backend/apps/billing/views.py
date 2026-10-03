import datetime
import uuid
from zoneinfo import ZoneInfo

from django.db.models import Q
from drf_spectacular.utils import extend_schema
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.billing.models import Invoice, Payment
from apps.billing.payments import refund_payment
from apps.billing.serializers import (
    InvoiceCancelSerializer,
    InvoiceDraftUpdateSerializer,
    InvoiceSerializer,
    PaymentRefundSerializer,
    PaymentSerializer,
)
from apps.billing.services import (
    cancel_invoice,
    delete_draft_invoice,
    issue_invoice,
    update_draft_invoice,
)
from apps.core.api.errors import DomainError
from apps.core.api.idempotency import idempotent
from apps.tenancy.viewsets import ShopScopedMixin

IST = ZoneInfo("Asia/Kolkata")


@extend_schema(tags=["Payments"])
class PaymentViewSet(ShopScopedMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = PaymentSerializer
    permission_map = {
        "list": "payments.view",
        "retrieve": "payments.view",
        "refund": "payments.refund",
    }
    http_method_names = ["get", "post"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Payment.objects.none()
        qs = Payment.objects.filter(shop=self.request.shop).select_related("customer", "received_by")
        date_param = self.request.query_params.get("date")
        if date_param:
            try:
                target_date = datetime.datetime.strptime(date_param, "%Y-%m-%d").date()
                start_ist = datetime.datetime.combine(target_date, datetime.time.min, tzinfo=IST)
                end_ist = datetime.datetime.combine(target_date, datetime.time.max, tzinfo=IST)
                start_utc = start_ist.astimezone(datetime.UTC)
                end_utc = end_ist.astimezone(datetime.UTC)
                qs = qs.filter(received_at__range=(start_utc, end_utc))
            except ValueError:
                raise DomainError(
                    "Invalid date format; expected YYYY-MM-DD.",
                    code="validation.failed",
                    status=400,
                ) from None

        mode_param = self.request.query_params.get("mode")
        if mode_param:
            qs = qs.filter(mode=mode_param)

        return qs.order_by("-received_at")

    @action(detail=True, methods=["post"])
    @idempotent(required=True)
    def refund(self, request, pk=None):
        payment = self.get_object()
        serializer = PaymentRefundSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        idempotency_key = getattr(request, "idempotency_key", None) or uuid.uuid4()
        refund = refund_payment(
            payment=payment,
            actor=request.user,
            amount_paise=serializer.validated_data["amount_paise"],
            reason=serializer.validated_data.get("reason", ""),
            idempotency_key=idempotency_key,
            request=request,
        )
        return Response(PaymentSerializer(refund, context={"request": request}).data, status=status.HTTP_201_CREATED)


@extend_schema(tags=["Invoices"])
class InvoiceViewSet(
    ShopScopedMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = InvoiceSerializer
    permission_map = {
        "list": "invoices.view",
        "retrieve": "invoices.view",
        "update": "invoices.create_draft",
        "partial_update": "invoices.create_draft",
        "destroy": "invoices.create_draft",
        "issue": "invoices.issue",
        "cancel": "invoices.cancel",
    }
    http_method_names = ["get", "patch", "delete", "post"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Invoice.objects.none()
        qs = (
            Invoice.objects.filter(shop=self.request.shop, deleted_at__isnull=True)
            .select_related("customer", "series", "issued_by")
            .prefetch_related("lines")
        )
        status_param = self.request.query_params.get("status")
        if status_param:
            statuses = [s.strip() for s in status_param.split(",") if s.strip()]
            qs = qs.filter(status__in=statuses)

        kind_param = self.request.query_params.get("kind")
        if kind_param:
            qs = qs.filter(kind=kind_param)

        from_param = self.request.query_params.get("from")
        if from_param:
            qs = qs.filter(issue_date__gte=from_param)

        to_param = self.request.query_params.get("to")
        if to_param:
            qs = qs.filter(issue_date__lte=to_param)

        q_param = self.request.query_params.get("q")
        if q_param:
            clean_q = q_param.strip()
            qs = qs.filter(
                Q(number_display__icontains=clean_q)
                | Q(customer__name__icontains=clean_q)
                | Q(customer__phone__icontains=clean_q)
            )

        job_param = self.request.query_params.get("job_id") or self.request.query_params.get("job")
        if job_param:
            qs = qs.filter(job_id=job_param)

        return qs.order_by("-created_at")

    def partial_update(self, request, *args, **kwargs):
        invoice = self.get_object()
        serializer = InvoiceDraftUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        updated = update_draft_invoice(
            invoice=invoice,
            actor=request.user,
            data=serializer.validated_data,
            request=request,
        )
        return Response(InvoiceSerializer(updated, context={"request": request}).data)

    def destroy(self, request, *args, **kwargs):
        invoice = self.get_object()
        delete_draft_invoice(invoice=invoice, actor=request.user, request=request)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"])
    @idempotent(required=False)
    def issue(self, request, pk=None):
        invoice = self.get_object()
        issued = issue_invoice(invoice=invoice, actor=request.user, request=request)
        return Response(InvoiceSerializer(issued, context={"request": request}).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        invoice = self.get_object()
        serializer = InvoiceCancelSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        original, credit_note = cancel_invoice(
            invoice=invoice,
            actor=request.user,
            reason=serializer.validated_data["reason"],
            request=request,
        )
        return Response(
            {
                "invoice": InvoiceSerializer(original, context={"request": request}).data,
                "credit_note": InvoiceSerializer(credit_note, context={"request": request}).data,
            },
            status=status.HTTP_200_OK,
        )
