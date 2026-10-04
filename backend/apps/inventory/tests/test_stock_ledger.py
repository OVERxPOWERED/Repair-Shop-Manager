from decimal import Decimal

import pytest
from django.core.management import call_command

from apps.core.api.errors import DomainError
from apps.inventory.models import Item, PriceHistory, StockMovement, Supplier
from apps.inventory.stock import move_stock

pytestmark = pytest.mark.django_db


def test_move_stock_in_and_out(world):
    shop = world.shop_a
    supplier = Supplier.objects.create(shop=shop, name="Display World Surat")
    item = Item.objects.create(
        shop=shop,
        name="iPhone 13 Display OLED",
        sku="DISP-IP13",
        cost_paise=350000,
        price_paise=650000,
    )
    assert item.qty_on_hand == Decimal("0.000")

    # 1. Stock In (Purchase of 5 displays)
    mv_in = move_stock(
        shop=shop,
        item=item,
        kind=StockMovement.Kind.IN,
        quantity=Decimal("5.000"),
        actor=world.owner_a,
        unit_cost_paise=340000,
        supplier=supplier,
        note="Initial purchase batch",
    )
    assert mv_in.kind == StockMovement.Kind.IN
    assert mv_in.quantity == Decimal("5.000")
    assert mv_in.unit_cost_paise == 340000

    item.refresh_from_db()
    assert item.qty_on_hand == Decimal("5.000")
    assert item.cost_paise == 340000

    # PriceHistory created
    hist = PriceHistory.objects.filter(item=item).first()
    assert hist is not None
    assert hist.cost_paise == 340000
    assert hist.supplier == supplier

    # 2. Stock Used in Repair (-1 display)
    mv_repair = move_stock(
        shop=shop,
        item=item,
        kind=StockMovement.Kind.REPAIR_USE,
        quantity=Decimal("-1.000"),
        actor=world.engineer_a,
        ref_type="job",
        note="Used in job #101",
    )
    assert mv_repair.quantity == Decimal("-1.000")

    item.refresh_from_db()
    assert item.qty_on_hand == Decimal("4.000")

    # 3. Counter Sale (-1 display)
    move_stock(
        shop=shop,
        item=item,
        kind=StockMovement.Kind.SALE,
        quantity=Decimal("-1.000"),
        actor=world.front_desk_a,
        ref_type="sale",
    )
    item.refresh_from_db()
    assert item.qty_on_hand == Decimal("3.000")


def test_move_stock_sign_validation(world):
    shop = world.shop_a
    item = Item.objects.create(shop=shop, name="Universal Adhesive B7000", sku="ADH-B7000")

    # Zero quantity is rejected
    with pytest.raises(DomainError) as exc:
        move_stock(shop=shop, item=item, kind=StockMovement.Kind.IN, quantity=Decimal("0.000"))
    assert exc.value.error_code == "stock.zero_quantity"

    # Outgoing movement with positive quantity is rejected
    with pytest.raises(DomainError) as exc:
        move_stock(shop=shop, item=item, kind=StockMovement.Kind.OUT, quantity=Decimal("2.000"))
    assert exc.value.error_code == "stock.invalid_sign"

    # Repair use with positive quantity is rejected
    with pytest.raises(DomainError) as exc:
        move_stock(shop=shop, item=item, kind=StockMovement.Kind.REPAIR_USE, quantity=Decimal("1.000"))
    assert exc.value.error_code == "stock.invalid_sign"

    # Incoming movement with negative quantity is rejected
    with pytest.raises(DomainError) as exc:
        move_stock(shop=shop, item=item, kind=StockMovement.Kind.IN, quantity=Decimal("-3.000"))
    assert exc.value.error_code == "stock.invalid_sign"

    # Adjustment can be positive or negative
    move_stock(shop=shop, item=item, kind=StockMovement.Kind.ADJUST, quantity=Decimal("10.000"))
    item.refresh_from_db()
    assert item.qty_on_hand == Decimal("10.000")

    move_stock(shop=shop, item=item, kind=StockMovement.Kind.ADJUST, quantity=Decimal("-2.000"))
    item.refresh_from_db()
    assert item.qty_on_hand == Decimal("8.000")


def test_stock_movement_append_only(world):
    shop = world.shop_a
    item = Item.objects.create(shop=shop, name="Soldering Wick 2.0mm")

    movement = move_stock(
        shop=shop,
        item=item,
        kind=StockMovement.Kind.IN,
        quantity=Decimal("10.000"),
    )

    # Calling delete() on instance raises RuntimeError
    with pytest.raises(RuntimeError, match="stock_movement is append-only"):
        movement.delete()

    # Calling save() on existing instance raises RuntimeError
    movement.note = "Tampered note"
    with pytest.raises(RuntimeError, match="stock_movement is append-only"):
        movement.save()

    # Calling queryset update() raises RuntimeError
    with pytest.raises(RuntimeError, match="stock_movement is append-only"):
        StockMovement.objects.filter(pk=movement.pk).update(quantity=Decimal("5.000"))

    # Calling queryset delete() raises RuntimeError
    with pytest.raises(RuntimeError, match="stock_movement is append-only"):
        StockMovement.objects.filter(pk=movement.pk).delete()


def test_parallel_move_stock_exact_balance(world):
    """10 move_stock(-1) calls leave exact quantity balance."""
    shop = world.shop_a
    item = Item.objects.create(shop=shop, name="Microphone Module Samsung A14")

    # Initial stock in 20
    move_stock(shop=shop, item=item, kind=StockMovement.Kind.IN, quantity=Decimal("20.000"))
    item.refresh_from_db()
    assert item.qty_on_hand == Decimal("20.000")

    # 10 deductions of 1
    for _ in range(10):
        move_stock(
            shop=shop,
            item=item,
            kind=StockMovement.Kind.REPAIR_USE,
            quantity=Decimal("-1.000"),
        )

    item.refresh_from_db()
    assert item.qty_on_hand == Decimal("10.000")
    assert StockMovement.objects.filter(item=item).count() == 11


def test_rebuild_stock_cache_management_command(world):
    shop = world.shop_a
    item1 = Item.objects.create(shop=shop, name="Battery Pixel 7")
    item2 = Item.objects.create(shop=shop, name="Battery Pixel 8")

    move_stock(shop=shop, item=item1, kind=StockMovement.Kind.IN, quantity=Decimal("15.000"))
    move_stock(shop=shop, item=item1, kind=StockMovement.Kind.SALE, quantity=Decimal("-3.000"))
    # item1 true balance: 12

    move_stock(shop=shop, item=item2, kind=StockMovement.Kind.IN, quantity=Decimal("8.000"))
    # item2 true balance: 8

    # Corrupt cached qty_on_hand directly via database update
    Item.objects.filter(pk=item1.pk).update(qty_on_hand=Decimal("999.000"))
    Item.objects.filter(pk=item2.pk).update(qty_on_hand=Decimal("-50.000"))

    # 1. Test dry-run
    call_command("rebuild_stock_cache", shop_id=str(shop.id), dry_run=True)
    item1.refresh_from_db()
    assert item1.qty_on_hand == Decimal("999.000")  # Untouched

    # 2. Test reconciliation
    call_command("rebuild_stock_cache", shop_id=str(shop.id))
    item1.refresh_from_db()
    item2.refresh_from_db()

    assert item1.qty_on_hand == Decimal("12.000")
    assert item2.qty_on_hand == Decimal("8.000")
