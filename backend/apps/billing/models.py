from django.conf import settings
from django.db import models

from apps.core.models import ShopScopedModel


class PaymentMode(models.TextChoices):
    CASH = "cash"
    UPI = "upi"
    CARD = "card"
    BANK = "bank"
    # No "credit": udhaar is an unpaid balance, tracked by the customer ledger in Phase 2.


class Payment(ShopScopedModel):
    class Direction(models.TextChoices):
        IN = "in"
        OUT = "out"  # refund

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
