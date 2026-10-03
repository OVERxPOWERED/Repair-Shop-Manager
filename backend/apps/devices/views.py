import re

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.api.errors import DomainError
from apps.core.validators import validate_imei_luhn
from apps.devices.models import Device, DeviceIdentifier
from apps.devices.serializers import DeviceSerializer
from apps.tenancy.viewsets import ShopScopedViewSet


class DeviceViewSet(ShopScopedViewSet):
    queryset = Device.objects.all()
    serializer_class = DeviceSerializer
    permission_map = {
        "list": "customers.view",
        "retrieve": "customers.view",
        "create": "customers.create",
        "update": "customers.edit",
        "partial_update": "customers.edit",
        "destroy": "customers.delete",
        "imei_lookup": "customers.view",
    }
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        qs = super().get_queryset()
        if getattr(self, "swagger_fake_view", False):
            return qs.none()

        customer_param = self.request.query_params.get("customer")
        if customer_param:
            qs = qs.filter(customer_id=customer_param)

        imei_param = self.request.query_params.get("imei")
        if imei_param:
            cleaned_imei = re.sub(r"\D", "", imei_param.strip())
            if cleaned_imei:
                qs = qs.filter(
                    identifiers__value__endswith=cleaned_imei,
                    identifiers__deleted_at__isnull=True,
                ).distinct()

        return qs.select_related("brand", "customer").prefetch_related("identifiers")

    @action(detail=False, methods=["get"], url_path="imei-lookup")
    def imei_lookup(self, request):
        value = request.query_params.get("value", "")
        cleaned = re.sub(r"[\s\-]", "", value or "").upper()
        if not cleaned:
            raise DomainError("Value query param is required.", code="validation.failed", status=400)

        luhn_valid = None
        if len(cleaned) == 15 and cleaned.isdigit():
            try:
                validate_imei_luhn(cleaned)
                luhn_valid = True
            except DjangoValidationError:
                luhn_valid = False

        matching_identifiers = DeviceIdentifier.objects.filter(
            shop=request.shop,
            value=cleaned,
            deleted_at__isnull=True,
            device__deleted_at__isnull=True,
        ).select_related("device__customer")
        matches = []
        from apps.jobs.models import Job

        for ident in matching_identifiers:
            dev = ident.device
            last_job = Job.objects.filter(shop=request.shop, device=dev).order_by("-job_no").first()
            matches.append(
                {
                    "device_id": str(dev.id),
                    "customer_id": str(dev.customer_id),
                    "customer_name": dev.customer.name,
                    "model": dev.model,
                    "last_job_no": last_job.job_no if last_job else None,
                    "last_job_id": str(last_job.id) if last_job else None,
                }
            )

        return Response(
            {
                "value": cleaned,
                "luhn_valid": luhn_valid,
                "matches": matches,
            }
        )
