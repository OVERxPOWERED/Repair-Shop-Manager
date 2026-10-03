from django.contrib.postgres.indexes import GinIndex
from django.db import models
from django.db.models import Q

from apps.core.choices import DeviceCategory
from apps.core.models import ShopScopedModel


class Device(ShopScopedModel):
    customer = models.ForeignKey("customers.Customer", on_delete=models.PROTECT, related_name="devices")
    category = models.CharField(max_length=20, choices=DeviceCategory.choices, default=DeviceCategory.MOBILE)
    brand = models.ForeignKey("tenancy.ShopBrand", on_delete=models.PROTECT, null=True, blank=True, related_name="+")
    brand_text = models.CharField(max_length=60, blank=True, default="")  # used when brand is not in the list
    model = models.CharField(max_length=100, blank=True, default="")
    color = models.CharField(max_length=40, blank=True, default="")
    notes = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-updated_at"]
        indexes = [models.Index(fields=["shop", "customer"], name="device_shop_customer_idx")]

    def __str__(self):
        brand_name = self.brand.name if self.brand else self.brand_text
        return f"{brand_name} {self.model}".strip() or "Device"


class DeviceIdentifier(ShopScopedModel):
    class Type(models.TextChoices):
        IMEI1 = "imei1"
        IMEI2 = "imei2"
        SERIAL = "serial"
        MEID = "meid"

    class CapturedVia(models.TextChoices):
        MANUAL = "manual"
        BARCODE = "barcode"
        OCR = "ocr"

    device = models.ForeignKey(Device, on_delete=models.PROTECT, related_name="identifiers")
    type = models.CharField(max_length=10, choices=Type.choices)
    value = models.CharField(max_length=32)
    luhn_valid = models.BooleanField(null=True)  # null for serial / meid
    captured_via = models.CharField(max_length=10, choices=CapturedVia.choices, default=CapturedVia.MANUAL)

    class Meta:
        ordering = ["type"]
        indexes = [
            models.Index(fields=["shop", "value"], name="devid_shop_value_idx"),
            GinIndex(fields=["value"], name="devid_value_trgm", opclasses=["gin_trgm_ops"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["device", "type"], condition=Q(deleted_at__isnull=True), name="devid_uniq_type_per_device"
            ),
        ]

    def __str__(self):
        return f"{self.type}: {self.value}"
