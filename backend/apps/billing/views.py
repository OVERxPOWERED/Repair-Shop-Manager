import datetime
import uuid
from zoneinfo import ZoneInfo

from drf_spectacular.utils import extend_schema
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.billing.models import Payment
from apps.billing.payments import refund_payment
from apps.billing.serializers import PaymentRefundSerializer, PaymentSerializer
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
