"""
Stock movement service for FixPro (Phase 2).
Enforces atomic ledger movements, sign verification, and cached stock balances.
"""

import logging
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from apps.core.api.errors import DomainError
from apps.inventory.models import Item, PriceHistory, StockMovement

logger = logging.getLogger("fixpro.inventory")

NEGATIVE_KINDS = {
    StockMovement.Kind.OUT,
    StockMovement.Kind.REPAIR_USE,
    StockMovement.Kind.SALE,
    StockMovement.Kind.RETURN_OUT,
}

POSITIVE_KINDS = {
    StockMovement.Kind.IN,
    StockMovement.Kind.RETURN_IN,
}


@transaction.atomic
def move_stock(
    *,
    shop,
    item: Item,
    kind: str,
    quantity: Decimal | int | float | str,
    actor=None,
    unit_cost_paise: int = 0,
    supplier=None,
    ref_type: str = "",
    ref_id=None,
    note: str = "",
) -> StockMovement:
    """
    The canonical atomic operation to mutate inventory quantities.
    Locks the item row with SELECT FOR UPDATE, enforces sign per movement kind,
    records the append-only StockMovement ledger entry, and updates the cached qty_on_hand.
    """
    qty = Decimal(str(quantity))
    if qty == 0:
        raise DomainError("Stock movement quantity cannot be zero.", code="stock.zero_quantity", status=400)

    # Validate signed quantity according to movement kind
    if kind in NEGATIVE_KINDS and qty > 0:
        raise DomainError(
            f"Quantity for movement kind '{kind}' must be negative (got {qty}).",
            code="stock.invalid_sign",
            status=400,
        )
    if kind in POSITIVE_KINDS and qty < 0:
        raise DomainError(
            f"Quantity for movement kind '{kind}' must be positive (got {qty}).",
            code="stock.invalid_sign",
            status=400,
        )

    # Lock the item row
    locked_item = Item.objects.select_for_update().get(pk=item.pk, shop=shop)

    # Create immutable ledger entry
    movement = StockMovement.objects.create(
        shop=shop,
        item=locked_item,
        kind=kind,
        quantity=qty,
        unit_cost_paise=unit_cost_paise,
        supplier=supplier,
        ref_type=ref_type,
        ref_id=ref_id,
        note=note,
        moved_by=actor,
        moved_at=timezone.now(),
    )

    # Atomically update cached stock balance
    locked_item.qty_on_hand = locked_item.qty_on_hand + qty
    update_fields = ["qty_on_hand", "updated_at"]

    # Record cost price history if purchase
    if kind == StockMovement.Kind.IN and unit_cost_paise > 0:
        PriceHistory.objects.create(
            shop=shop,
            item=locked_item,
            supplier=supplier,
            cost_paise=unit_cost_paise,
        )
        locked_item.cost_paise = unit_cost_paise
        update_fields.append("cost_paise")

    locked_item.save(update_fields=update_fields)

    if locked_item.qty_on_hand < 0:
        logger.warning(
            "Item %s (id=%s) has negative stock balance: %s",
            locked_item.name,
            locked_item.pk,
            locked_item.qty_on_hand,
        )

    return movement
