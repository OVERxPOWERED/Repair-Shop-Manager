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
        "list_trash": "customers.delete",
        "restore": "customers.delete",
        "destroy_permanent": "data.bulk_delete",
    }
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def can_hard_delete(self, obj) -> bool:
        from apps.billing.models import Invoice, Payment
        from apps.jobs.models import Job

        has_jobs = Job.all_objects.filter(customer=obj).exists()
        has_payments = Payment.all_objects.filter(customer=obj).exists()
        has_invoices = Invoice.all_objects.filter(customer=obj).exists()
        return not (has_jobs or has_payments or has_invoices)

    def before_restore(self, obj):
        from apps.core.api.errors import ConflictError

        if obj.phone and Customer.objects.filter(shop=self.request.shop, phone=obj.phone).exclude(id=obj.id).exists():
            raise ConflictError("Another customer with this phone number exists.", code="customer.phone_exists")

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

        has_due = self.request.query_params.get("has_due")
        if has_due in ("true", "1", "yes"):
            from django.db.models import Case, F, IntegerField, OuterRef, Subquery, Sum, When
            from django.db.models.functions import Coalesce

            from apps.billing.models import Payment
            from apps.jobs.models import Job

            in_sub = (
                Payment.objects.filter(
                    shop=self.request.shop,
                    job=OuterRef("pk"),
                    direction=Payment.Direction.IN,
                    deleted_at__isnull=True,
                )
                .values("job")
                .annotate(total=Sum("amount_paise"))
                .values("total")
            )

            out_sub = (
                Payment.objects.filter(
                    shop=self.request.shop,
                    job=OuterRef("pk"),
                    direction=Payment.Direction.OUT,
                    deleted_at__isnull=True,
                )
                .values("job")
                .annotate(total=Sum("amount_paise"))
                .values("total")
            )

            billable_expr = Case(
                When(total_paise__gt=0, then=F("total_paise")),
                default=F("estimate_paise"),
                output_field=IntegerField(),
            )

            jobs_with_due = (
                Job.objects.filter(shop=self.request.shop, deleted_at__isnull=True)
                .annotate(
                    paid=Coalesce(Subquery(in_sub, output_field=IntegerField()), 0)
                    - Coalesce(Subquery(out_sub, output_field=IntegerField()), 0),
                    billable=billable_expr,
                )
                .filter(billable__gt=F("paid"))
                .values("customer_id")
            )
            qs = qs.filter(id__in=Subquery(jobs_with_due))

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
