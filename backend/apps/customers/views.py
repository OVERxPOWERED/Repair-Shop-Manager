import re

from django.db.models import Q

from apps.audit.services import record_audit, snapshot
from apps.core.api.concurrency import save_with_version
from apps.core.api.idempotency import idempotent
from apps.core.phone import mask_phone, normalize_phone
from apps.customers.models import Customer
from apps.customers.serializers import CustomerSerializer
from apps.tenancy.viewsets import ShopScopedViewSet

CUSTOMER_AUDIT_FIELDS = [
    "name",
    "phone",
    "alt_phone",
    "email",
    "address",
    "notes",
    "preferred_locale",
    "whatsapp_opt_in",
    "sms_opt_in",
]


def customer_audit_snapshot(customer: Customer) -> dict:
    data = snapshot(customer, CUSTOMER_AUDIT_FIELDS)
    if data.get("phone"):
        data["phone"] = mask_phone(data["phone"])
    if data.get("alt_phone"):
        data["alt_phone"] = mask_phone(data["alt_phone"])
    return data


class CustomerViewSet(ShopScopedViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    permission_map = {
        "list": "customers.view",
        "retrieve": "customers.view",
        "create": "customers.create",
        "update": "customers.edit",
        "partial_update": "customers.edit",
        "destroy": "customers.delete",
    }
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        qs = super().get_queryset()
        if getattr(self, "swagger_fake_view", False):
            return qs.none()

        q = self.request.query_params.get("q")
        if q:
            q = q.strip()
            digits = re.sub(r"\D", "", q)
            if len(digits) >= 3:
                qs = qs.filter(Q(phone__contains=digits) | Q(alt_phone__contains=digits))
            else:
                qs = qs.filter(name__icontains=q)

        phone_param = self.request.query_params.get("phone")
        if phone_param:
            try:
                normalized = normalize_phone(phone_param.strip())
                qs = qs.filter(phone=normalized)
            except ValueError:
                qs = qs.none()

        ordering = self.request.query_params.get("ordering")
        allowed_orderings = {
            "name": "name",
            "-name": "-name",
            "updated_at": "updated_at",
            "-updated_at": "-updated_at",
            "last_job_at": "last_job_at",
            "-last_job_at": "-last_job_at",
        }
        order_by_field = allowed_orderings.get(ordering, "-updated_at")
        return qs.order_by(order_by_field)

    @idempotent(required=False)
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        customer = serializer.save(shop=self.request.shop, created_by=self.request.user)
        record_audit(
            action="customer.created",
            entity=customer,
            request=self.request,
            after=customer_audit_snapshot(customer),
        )

    def perform_update(self, serializer):
        before = customer_audit_snapshot(serializer.instance)
        customer = save_with_version(self.request, serializer)
        after = customer_audit_snapshot(customer)
        record_audit(
            action="customer.updated",
            entity=customer,
            request=self.request,
            before=before,
            after=after,
        )

    def perform_destroy(self, instance):
        before = customer_audit_snapshot(instance)
        instance.soft_delete()
        record_audit(
            action="customer.deleted",
            entity=instance,
            request=self.request,
            before=before,
        )
