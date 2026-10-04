from decimal import Decimal

import pytest
from django.db import IntegrityError, transaction

from apps.customers.models import Customer
from apps.inventory.models import (
    Demand,
    Item,
    ItemCategory,
    ItemCompatibility,
    Supplier,
)

pytestmark = pytest.mark.django_db


def test_item_category_hierarchy_and_uniqueness(world):
    shop = world.shop_a

    parent = ItemCategory.objects.create(shop=shop, name="Displays & Screens")
    child = ItemCategory.objects.create(shop=shop, name="OLED Panels", parent=parent)

    assert str(child) == "Displays & Screens > OLED Panels"
    assert child.parent == parent

    # Duplicate name in same shop when active is prohibited
    with transaction.atomic(), pytest.raises(IntegrityError):
        ItemCategory.objects.create(shop=shop, name="Displays & Screens")

    # Other shop can have same category name (tenant isolation)
    other_cat = ItemCategory.objects.create(shop=world.shop_b, name="Displays & Screens")
    assert other_cat.shop == world.shop_b


def test_item_category_soft_delete(world):
    shop = world.shop_a
    cat = ItemCategory.objects.create(shop=shop, name="Batteries")

    cat.soft_delete()
    assert ItemCategory.objects.filter(shop=shop, name="Batteries").count() == 0
    assert ItemCategory.all_objects.filter(shop=shop, name="Batteries").count() == 1

    # Can recreate same category name after soft deletion
    new_cat = ItemCategory.objects.create(shop=shop, name="Batteries")
    assert new_cat.id != cat.id


def test_supplier_creation(world):
    shop = world.shop_a
    supplier = Supplier.objects.create(
        shop=shop,
        name="Nehru Place Spare Parts Hub",
        phone="+919811223344",
        gstin="07AAAAA0000A1Z5",
        payable_paise=1500000,
    )
    assert supplier.name == "Nehru Place Spare Parts Hub"
    assert str(supplier) == "Nehru Place Spare Parts Hub"
    assert supplier.payable_paise == 1500000


def test_item_sku_and_barcode_uniqueness(world):
    shop = world.shop_a
    cat = ItemCategory.objects.create(shop=shop, name="Charging Ports")

    item1 = Item.objects.create(
        shop=shop,
        category=cat,
        name="Type-C Connector Flex",
        sku="SKU-TYPEC-01",
        barcode="8901234567890",
        cost_paise=4500,
        price_paise=15000,
    )
    assert item1.qty_on_hand == Decimal("0.000")

    # Duplicate SKU in same shop raises IntegrityError
    with transaction.atomic(), pytest.raises(IntegrityError):
        Item.objects.create(
            shop=shop,
            name="Type-C Connector Flex Copy",
            sku="SKU-TYPEC-01",
        )

    # Duplicate Barcode in same shop raises IntegrityError
    with transaction.atomic(), pytest.raises(IntegrityError):
        Item.objects.create(
            shop=shop,
            name="Another Port",
            barcode="8901234567890",
        )

    # Empty SKU and Barcode can exist multiple times without conflict
    item_blank1 = Item.objects.create(shop=shop, name="Generic Resistor 1", sku="", barcode="")
    item_blank2 = Item.objects.create(shop=shop, name="Generic Resistor 2", sku="", barcode="")
    assert item_blank1.id != item_blank2.id

    # Soft delete releases the unique constraint
    item1.soft_delete()
    recreated = Item.objects.create(
        shop=shop,
        name="Type-C Connector Flex Re-added",
        sku="SKU-TYPEC-01",
        barcode="8901234567890",
    )
    assert recreated.sku == "SKU-TYPEC-01"


def test_item_compatibility(world):
    shop = world.shop_a
    item = Item.objects.create(shop=shop, name="AMOLED Display Assembly", sku="DISP-AMOLED-SAM")

    compat = ItemCompatibility.objects.create(
        shop=shop,
        item=item,
        device_brand="Samsung",
        device_model="Galaxy M34",
        notes="Fits 4G and 5G variants",
    )
    assert compat.device_brand == "Samsung"
    assert compat.device_model == "Galaxy M34"
    assert str(compat) == "AMOLED Display Assembly ↔ Samsung Galaxy M34"

    # Duplicate compatibility triple for same item raises IntegrityError
    with transaction.atomic(), pytest.raises(IntegrityError):
        ItemCompatibility.objects.create(
            shop=shop,
            item=item,
            device_brand="Samsung",
            device_model="Galaxy M34",
        )


def test_customer_demand(world):
    shop = world.shop_a
    cust = Customer.objects.create(shop=shop, name="Ankit Rao", phone="+919876500000")

    demand = Demand.objects.create(
        shop=shop,
        item_text="OnePlus 11R Original Battery BLP987",
        customer=cust,
        quantity=Decimal("1.000"),
        status=Demand.Status.OPEN,
        note="Customer willing to wait 2 days",
    )
    assert demand.status == Demand.Status.OPEN
    assert demand.customer == cust
    assert "OnePlus 11R" in str(demand)
