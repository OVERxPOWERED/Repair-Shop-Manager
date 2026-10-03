from decimal import Decimal

from django.conf import settings
from django.db import models

from apps.core.models import ShopScopedModel, TimeStampedModel, UUIDModel


class PaymentMode(models.TextChoices):
    CASH = "cash"
    UPI = "upi"
    CARD = "card"
    BANK = "bank"
    # No "credit": udhaar is an unpaid balance, tracked by the customer ledger in Phase 2.


class InvoiceSeries(UUIDModel, TimeStampedModel):
    class Kind(models.TextChoices):
        INVOICE = "invoice", "Invoice"
        CREDIT_NOTE = "credit_note", "Credit Note"
        BILL_OF_SUPPLY = "bill_of_supply", "Bill of Supply"

    shop = models.ForeignKey(
        "tenancy.Shop",
        on_delete=models.PROTECT,
        related_name="invoice_series",
    )
    kind = models.CharField(max_length=20, choices=Kind.choices)
    fy_start_year = models.IntegerField()
    prefix = models.CharField(max_length=8)
    last_number = models.IntegerField(default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["shop", "kind", "fy_start_year"],
                name="invseries_uniq_shop_kind_fy",
            )
        ]
        indexes = [
            models.Index(fields=["shop", "kind", "fy_start_year"], name="invseries_lookup_idx"),
        ]

    def __str__(self):
        return f"{self.prefix} ({self.kind} FY{self.fy_start_year}): {self.last_number}"


class Invoice(ShopScopedModel):
    class Kind(models.TextChoices):
        SIMPLE_BILL = "simple_bill", "Simple Bill"
        TAX_INVOICE = "tax_invoice", "Tax Invoice"
        BILL_OF_SUPPLY = "bill_of_supply", "Bill of Supply"
        CREDIT_NOTE = "credit_note", "Credit Note"

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        ISSUED = "issued", "Issued"
        CANCELLED = "cancelled", "Cancelled"

    job = models.ForeignKey(
        "jobs.Job",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="invoices",
    )
    customer = models.ForeignKey(
        "customers.Customer",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="invoices",
    )
    kind = models.CharField(max_length=16, choices=Kind.choices)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)
    series = models.ForeignKey(
        InvoiceSeries,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="invoices",
    )
    number = models.IntegerField(null=True, blank=True)
    number_display = models.CharField(max_length=32, blank=True, default="")
    issue_date = models.DateField(null=True, blank=True)
    original_invoice = models.ForeignKey(
        "self",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="credit_notes",
    )
    place_of_supply_state = models.CharField(max_length=2, blank=True, default="")
    customer_gstin = models.CharField(max_length=15, blank=True, default="")

    # Financial components (all integer paise)
    subtotal_paise = models.BigIntegerField(default=0)
    discount_paise = models.BigIntegerField(default=0)
    taxable_paise = models.BigIntegerField(default=0)
    cgst_paise = models.BigIntegerField(default=0)
    sgst_paise = models.BigIntegerField(default=0)
    igst_paise = models.BigIntegerField(default=0)
    round_off_paise = models.BigIntegerField(default=0)
    total_paise = models.BigIntegerField(default=0)
    amount_paid_paise = models.BigIntegerField(default=0)

    # Immutably frozen on issue
    shop_snapshot = models.JSONField(default=dict, blank=True)
    customer_snapshot = models.JSONField(default=dict, blank=True)
    pdf_key = models.TextField(blank=True, default="")
    notes = models.TextField(blank=True, default="")
    terms = models.TextField(blank=True, default="")

    issued_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="+",
    )
    issued_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancel_reason = models.TextField(blank=True, default="")
    version = models.PositiveIntegerField(default=1)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["shop", "series", "number"],
                condition=models.Q(number__isnull=False),
                name="inv_uniq_shop_series_number",
            ),
            models.UniqueConstraint(
                fields=["job"],
                condition=models.Q(job__isnull=False, status__in=["draft", "issued"], deleted_at__isnull=True)
                & ~models.Q(kind="credit_note"),
                name="inv_uniq_live_job_invoice",
            ),
            models.CheckConstraint(
                condition=models.Q(
                    total_paise=models.F("taxable_paise")
                    + models.F("cgst_paise")
                    + models.F("sgst_paise")
                    + models.F("igst_paise")
                    + models.F("round_off_paise")
                ),
                name="inv_total_paise_sum",
            ),
        ]
        indexes = [
            models.Index(fields=["shop", "-created_at"], name="inv_shop_created_idx"),
            models.Index(fields=["shop", "status"], name="inv_shop_status_idx"),
            models.Index(fields=["shop", "issue_date"], name="inv_shop_issue_date_idx"),
            models.Index(fields=["shop", "number_display"], name="inv_shop_num_disp_idx"),
        ]

    @property
    def balance_paise(self) -> int:
        return max(0, self.total_paise - self.amount_paid_paise)

    def save(self, *args, **kwargs):
        if self.pk:
            # Check existing status from database to enforce immutability
            allowed_mutable = {
                "amount_paid_paise",
                "pdf_key",
                "status",
                "cancelled_at",
                "cancel_reason",
                "updated_at",
                "version",
            }
            check_fields = [
                f.attname
                for f in self._meta.fields
                if f.name not in allowed_mutable and f.attname not in allowed_mutable and f.attname != "id"
            ]
            existing = Invoice.objects.filter(pk=self.pk).values("status", *check_fields).first()
            if existing:
                old_status = existing["status"]
                if old_status in (self.Status.ISSUED, self.Status.CANCELLED):
                    # Status transition: cancelled is terminal; issued can only become cancelled
                    if old_status == self.Status.CANCELLED and self.status != self.Status.CANCELLED:
                        raise RuntimeError("Issued invoices are immutable")
                    if old_status == self.Status.ISSUED and self.status not in (
                        self.Status.ISSUED,
                        self.Status.CANCELLED,
                    ):
                        raise RuntimeError("Issued invoices are immutable")
                    for field_name in check_fields:
                        old_val = existing[field_name]
                        new_val = getattr(self, field_name)
                        if new_val != old_val:
                            raise RuntimeError(f"Issued invoices are immutable: {field_name} changed")

        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        if self.status != self.Status.DRAFT:
            raise RuntimeError("Issued invoices are immutable")
        super().delete(*args, **kwargs)

    def soft_delete(self):
        if self.status != self.Status.DRAFT:
            raise RuntimeError("Issued invoices are immutable")
        super().soft_delete()

    def __str__(self):
        return f"{self.number_display or 'Draft'} ({self.kind} - {self.status})"


class InvoiceLine(ShopScopedModel):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="lines")
    position = models.PositiveIntegerField(default=0)
    description = models.CharField(max_length=255)
    hsn_sac = models.CharField(max_length=8, blank=True, default="")
    quantity = models.DecimalField(max_digits=10, decimal_places=3, default=Decimal("1"))
    unit_price_paise = models.BigIntegerField(default=0)
    discount_paise = models.BigIntegerField(default=0)
    tax_inclusive = models.BooleanField(default=False)
    tax_rate_bp = models.IntegerField(default=0)  # basis points: 1800 = 18%
    taxable_paise = models.BigIntegerField(default=0)
    cgst_paise = models.BigIntegerField(default=0)
    sgst_paise = models.BigIntegerField(default=0)
    igst_paise = models.BigIntegerField(default=0)
    line_total_paise = models.BigIntegerField(default=0)

    class Meta:
        ordering = ["position", "created_at"]
        indexes = [
            models.Index(fields=["invoice", "position"], name="invline_inv_pos_idx"),
        ]

    def save(self, *args, **kwargs):
        if hasattr(self, "invoice") and self.invoice and self.invoice.status != Invoice.Status.DRAFT:
            raise RuntimeError("Issued invoices are immutable")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        if hasattr(self, "invoice") and self.invoice and self.invoice.status != Invoice.Status.DRAFT:
            raise RuntimeError("Issued invoices are immutable")
        super().delete(*args, **kwargs)

    def soft_delete(self):
        if hasattr(self, "invoice") and self.invoice and self.invoice.status != Invoice.Status.DRAFT:
            raise RuntimeError("Issued invoices are immutable")
        super().soft_delete()

    def __str__(self):
        return f"{self.description} ({self.quantity} x {self.unit_price_paise})"


class Payment(ShopScopedModel):
    class Direction(models.TextChoices):
        IN = "in"
        OUT = "out"  # refund

    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="payments",
    )
    job = models.ForeignKey(
        "jobs.Job",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="payments",
    )
    customer = models.ForeignKey(
        "customers.Customer",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="payments",
    )
    direction = models.CharField(max_length=3, choices=Direction.choices, default=Direction.IN)
    mode = models.CharField(max_length=8, choices=PaymentMode.choices)
    amount_paise = models.BigIntegerField()
    reference = models.CharField(max_length=100, blank=True, default="")  # UPI ref no., card slip, etc.
    received_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")
    received_at = models.DateTimeField()
    refunds_payment = models.ForeignKey(
        "self",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="refunds",
    )
    idempotency_key = models.UUIDField()
    notes = models.TextField(blank=True, default="")

    class Meta:
        constraints = [
            models.CheckConstraint(condition=models.Q(amount_paise__gt=0), name="pay_amount_positive"),
            models.UniqueConstraint(fields=["shop", "idempotency_key"], name="pay_uniq_idem_per_shop"),
        ]
        indexes = [models.Index(fields=["shop", "-received_at"], name="pay_shop_received_idx")]

    def __str__(self):
        return f"{self.direction.upper()} {self.mode} {self.amount_paise}p ({self.id})"
