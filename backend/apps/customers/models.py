from django.contrib.postgres.indexes import GinIndex
from django.db import models
from django.db.models import Q

from apps.core.models import ShopScopedModel


class Customer(ShopScopedModel):
    name = models.CharField(max_length=150)
    phone = models.CharField(max_length=16, null=True, blank=True)  # E.164; null allowed for rough entries
    alt_phone = models.CharField(max_length=16, blank=True, default="")
    email = models.EmailField(blank=True, default="")
    address = models.TextField(blank=True, default="")
    notes = models.TextField(blank=True, default="")
    preferred_locale = models.CharField(max_length=8, default="en")
    whatsapp_opt_in = models.BooleanField(default=True)  # transactional updates; TODO(verify) DPDP consent wording
    sms_opt_in = models.BooleanField(default=True)
    last_job_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["shop", "-updated_at"], name="cust_shop_updated_idx"),
            GinIndex(fields=["name"], name="cust_name_trgm", opclasses=["gin_trgm_ops"]),
            GinIndex(fields=["phone"], name="cust_phone_trgm", opclasses=["gin_trgm_ops"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["shop", "phone"],
                condition=Q(deleted_at__isnull=True) & Q(phone__isnull=False),
                name="cust_uniq_phone_per_shop",
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.phone or 'no phone'})"
