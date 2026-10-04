"""
Inventory models for FixPro (Phase 2).
Implements items, categories, suppliers, stock ledger movements, hardware compatibility, and customer demands.
"""

from decimal import Decimal

from django.conf import settings
from django.contrib.postgres.indexes import GinIndex
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from apps.core.models import (
    ShopScopedModel,
    ShopScopedQuerySet,
    UUIDModel,
)


class ItemCategory(ShopScopedModel):
    """Hierarchical category for inventory parts, accessories, and consumables."""

    name = models.CharField(max_length=100)
    parent = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="children",
    )

    class Meta:
        verbose_name = _("Item Category")
        verbose_name_plural = _("Item Categories")
        constraints = [
            models.UniqueConstraint(
                fields=["shop", "name"],
                condition=models.Q(deleted_at__isnull=True),
                name="item_category_unique_shop_name",
            )
        ]
        indexes = [
            models.Index(fields=["shop", "name"], name="item_cat_shop_name_idx"),
        ]

    def __str__(self):
        if self.parent:
            return f"{self.parent.name} > {self.name}"
        return self.name


class Supplier(ShopScopedModel):
    """Wholesale supplier/vendor providing parts, accessories, or consumables."""

    name = models.CharField(max_length=150)
    phone = models.CharField(max_length=16, blank=True, default="")
    address = models.TextField(blank=True, default="")
    gstin = models.CharField(max_length=15, blank=True, null=True)
    notes = models.TextField(blank=True, default="")
    payable_paise = models.BigIntegerField(
        default=0,
        help_text="Cached running balance payable to supplier in integer paise",
    )

    class Meta:
        verbose_name = _("Supplier")
        verbose_name_plural = _("Suppliers")
        indexes = [
            models.Index(fields=["shop", "name"], name="supplier_shop_name_idx"),
            models.Index(fields=["shop", "phone"], name="supplier_shop_phone_idx"),
        ]

    def __str__(self):
        return self.name


class Item(ShopScopedModel):
    """
    Physical spare part, retail accessory, or shop consumable.
    Tracks SKU, barcode, pricing, and cached quantity on hand.
    """

    category = models.ForeignKey(
        ItemCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="items",
    )
    sku = models.CharField(max_length=64, blank=True, default="", db_index=True)
    name = models.CharField(max_length=200, db_index=True)
    brand = models.CharField(max_length=100, blank=True, default="", db_index=True)
    barcode = models.CharField(max_length=64, blank=True, default="", db_index=True)
    hsn_sac = models.CharField(max_length=16, blank=True, default="")
    unit = models.CharField(max_length=20, default="pcs")
    cost_paise = models.BigIntegerField(
        default=0,
        help_text="Latest purchase cost price in integer paise (protected by money.see_cost_profit)",
    )
    price_paise = models.BigIntegerField(
        default=0,
        help_text="Selling price in integer paise",
    )
    tax_rate_bp = models.PositiveIntegerField(
        default=1800,
        help_text="GST tax rate in basis points (e.g. 1800 = 18.00%)",
    )
    reorder_level = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        default=Decimal("0.000"),
        help_text="Stock threshold triggering low-stock alert",
    )
    is_service = models.BooleanField(
        default=False,
        help_text="True if this is a labor/service item rather than physical stock",
    )
    is_active = models.BooleanField(default=True)
    qty_on_hand = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        default=Decimal("0.000"),
        help_text="Cached stock quantity on hand, updated atomically by move_stock",
    )

    class Meta:
        verbose_name = _("Item")
        verbose_name_plural = _("Items")
        constraints = [
            models.UniqueConstraint(
                fields=["shop", "sku"],
                condition=~models.Q(sku="") & models.Q(deleted_at__isnull=True),
                name="item_unique_shop_sku",
            ),
            models.UniqueConstraint(
                fields=["shop", "barcode"],
                condition=~models.Q(barcode="") & models.Q(deleted_at__isnull=True),
                name="item_unique_shop_barcode",
            ),
        ]
        indexes = [
            models.Index(fields=["shop", "-created_at"], name="item_shop_created_idx"),
            models.Index(fields=["shop", "category"], name="item_shop_category_idx"),
            GinIndex(fields=["name"], name="item_name_trgm_idx", opclasses=["gin_trgm_ops"]),
        ]

    def __str__(self):
        if self.sku:
            return f"{self.name} ({self.sku})"
        return self.name


class ItemCompatibility(ShopScopedModel):
    """
    Hardware compatibility (H/W Match) linking parts to specific phone/device models.
    """

    item = models.ForeignKey(
        Item,
        on_delete=models.CASCADE,
        related_name="compatibilities",
    )
    device_brand = models.CharField(max_length=100, db_index=True)
    device_model = models.CharField(max_length=100, db_index=True)
    notes = models.TextField(blank=True, default="")

    class Meta:
        verbose_name = _("Item Compatibility")
        verbose_name_plural = _("Item Compatibilities")
        constraints = [
            models.UniqueConstraint(
                fields=["item", "device_brand", "device_model"],
                condition=models.Q(deleted_at__isnull=True),
                name="item_compat_unique_triple",
            )
        ]
        indexes = [
            models.Index(fields=["shop", "device_brand", "device_model"], name="compat_shop_brand_model_idx"),
        ]

    def __str__(self):
        return f"{self.item.name} ↔ {self.device_brand} {self.device_model}"


class AppendOnlyStockQuerySet(ShopScopedQuerySet):
    """Guarantees that stock ledger entries cannot be mutated or deleted."""

    def update(self, **kwargs):
        raise RuntimeError("stock_movement is append-only")

    def delete(self):
        raise RuntimeError("stock_movement is append-only")


class StockMovement(UUIDModel):
    """
    Append-only inventory transaction ledger.
    Every addition, deduction, adjustment, repair consumption, or sale is logged here.
    """

    class Kind(models.TextChoices):
        IN = "in", _("Stock In (Purchase)")
        OUT = "out", _("Stock Out")
        ADJUST = "adjust", _("Adjustment")
        RETURN_IN = "return_in", _("Customer Return In")
        RETURN_OUT = "return_out", _("Supplier Return Out")
        REPAIR_USE = "repair_use", _("Used in Repair Job")
        SALE = "sale", _("POS Counter Sale")

    shop = models.ForeignKey(
        "tenancy.Shop",
        on_delete=models.PROTECT,
        related_name="+",
    )
    item = models.ForeignKey(
        Item,
        on_delete=models.PROTECT,
        related_name="movements",
    )
    kind = models.CharField(max_length=20, choices=Kind.choices)
    quantity = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        help_text="Signed quantity (+ for additions, - for deductions)",
    )
    unit_cost_paise = models.BigIntegerField(
        default=0,
        help_text="Unit cost price at the time of movement in integer paise",
    )
    supplier = models.ForeignKey(
        Supplier,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    ref_type = models.CharField(
        max_length=32,
        blank=True,
        default="",
        help_text="Source reference kind: job, sale, purchase, adjustment",
    )
    ref_id = models.UUIDField(null=True, blank=True, help_text="ID of linked Job, Sale, or Purchase record")
    note = models.TextField(blank=True, default="")
    moved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    moved_at = models.DateTimeField(default=timezone.now, db_index=True)

    objects = AppendOnlyStockQuerySet.as_manager()

    class Meta:
        verbose_name = _("Stock Movement")
        verbose_name_plural = _("Stock Movements")
        ordering = ["-moved_at"]
        constraints = [
            models.CheckConstraint(
                check=~models.Q(quantity=0),
                name="stock_movement_quantity_nonzero",
            )
        ]
        indexes = [
            models.Index(fields=["shop", "-moved_at"], name="stock_mv_shop_date_idx"),
            models.Index(fields=["item", "-moved_at"], name="stock_mv_item_date_idx"),
            models.Index(fields=["ref_type", "ref_id"], name="stock_mv_ref_idx"),
        ]

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise RuntimeError("stock_movement is append-only")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise RuntimeError("stock_movement is append-only")

    def __str__(self):
        return f"{self.kind.upper()} {self.quantity:+} {self.item.name} on {self.moved_at:%Y-%m-%d}"


class PriceHistory(UUIDModel):
    """
    Historical cost pricing log for items per supplier.
    Powers wholesale price-trend tracking and price drop alerts.
    """

    shop = models.ForeignKey(
        "tenancy.Shop",
        on_delete=models.PROTECT,
        related_name="+",
    )
    item = models.ForeignKey(
        Item,
        on_delete=models.CASCADE,
        related_name="price_history",
    )
    supplier = models.ForeignKey(
        Supplier,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    cost_paise = models.BigIntegerField(help_text="Cost price in integer paise at recording time")
    recorded_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        verbose_name = _("Price History")
        verbose_name_plural = _("Price Histories")
        ordering = ["-recorded_at"]
        indexes = [
            models.Index(fields=["item", "-recorded_at"], name="price_hist_item_date_idx"),
            models.Index(fields=["shop", "-recorded_at"], name="price_hist_shop_date_idx"),
        ]

    def __str__(self):
        return f"{self.item.name}: ₹{self.cost_paise / 100:.2f} on {self.recorded_at:%Y-%m-%d}"


class Demand(ShopScopedModel):
    """
    Customer parts request / demand tracker when a requested item is out of stock.
    """

    class Status(models.TextChoices):
        OPEN = "open", _("Open")
        FULFILLED = "fulfilled", _("Fulfilled")
        DROPPED = "dropped", _("Dropped / Cancelled")

    item_text = models.CharField(max_length=200, help_text="Requested part or accessory description")
    customer = models.ForeignKey(
        "customers.Customer",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="demands",
    )
    quantity = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        default=Decimal("1.000"),
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.OPEN,
    )
    note = models.TextField(blank=True, default="")

    class Meta:
        verbose_name = _("Demand")
        verbose_name_plural = _("Demands")
        indexes = [
            models.Index(fields=["shop", "status", "-created_at"], name="demand_shop_status_idx"),
        ]

    def __str__(self):
        return f"{self.item_text} x{self.quantity} ({self.status})"
