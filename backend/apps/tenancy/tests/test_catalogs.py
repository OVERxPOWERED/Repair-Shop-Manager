import pytest

from apps.core.testing import assert_other_shop_hidden
from apps.tenancy.models import AccessoryOption, ShopBrand

pytestmark = pytest.mark.django_db


def test_new_shop_has_seeded_catalogs(world):
    """A new shop is seeded with 17 mobile brands, 9 accessories, and other categories."""
    assert ShopBrand.objects.filter(shop=world.shop_a, device_category="mobile").count() == 17
    assert ShopBrand.objects.filter(shop=world.shop_a, device_category="laptop").count() == 7
    assert ShopBrand.objects.filter(shop=world.shop_a, device_category="tv").count() == 7
    assert ShopBrand.objects.filter(shop=world.shop_a, device_category="appliance").count() == 6
    assert AccessoryOption.objects.filter(shop=world.shop_a).count() == 9

    # Pre-ticked defaults
    sim_tray = AccessoryOption.objects.get(shop=world.shop_a, name="SIM tray")
    assert sim_tray.is_default is True


def test_soft_delete_brand(world):
    """ShopBrand is a ShopScopedModel: delete() is soft and objects manager hides it."""
    brand = ShopBrand.objects.filter(shop=world.shop_a, name="Apple", device_category="mobile").first()
    assert brand is not None
    brand_id = brand.id

    brand.delete()

    assert not ShopBrand.objects.filter(id=brand_id).exists()
    assert ShopBrand.all_objects.filter(id=brand_id).exists()
    brand.refresh_from_db()
    assert brand.deleted_at is not None


def test_engineer_can_list_but_not_create(world, client_for):
    """Engineer has jobs.view so can list/retrieve, but lacks shop.settings so cannot create/modify/delete."""
    c = client_for(world.engineer_a, world.shop_a)

    r_brands = c.get("/api/v1/brands/?device_category=mobile")
    assert r_brands.status_code == 200
    assert len(r_brands.json()["data"]) == 17

    r_acc = c.get("/api/v1/accessory-options/")
    assert r_acc.status_code == 200
    assert len(r_acc.json()["data"]) == 9

    # Cannot create brand
    r_create_brand = c.post(
        "/api/v1/brands/",
        {"name": "CustomBrand", "device_category": "mobile"},
        format="json",
    )
    assert r_create_brand.status_code == 403

    # Cannot create accessory
    r_create_acc = c.post(
        "/api/v1/accessory-options/",
        {"name": "CustomAccessory"},
        format="json",
    )
    assert r_create_acc.status_code == 403


def test_owner_can_create_and_manage(world, client_for):
    """Owner has shop.settings and can create, update, and delete brands and accessories."""
    c = client_for(world.owner_a, world.shop_a)

    # Create brand
    r_brand = c.post(
        "/api/v1/brands/",
        {"name": "Fairphone", "device_category": "mobile", "sort_order": 50},
        format="json",
    )
    assert r_brand.status_code == 201
    brand_id = r_brand.json()["data"]["id"]
    assert r_brand.json()["data"]["name"] == "Fairphone"

    # Update brand (requires If-Match version)
    r_patch = c.patch(
        f"/api/v1/brands/{brand_id}/",
        {"name": "Fairphone 5"},
        format="json",
        HTTP_IF_MATCH="1",
    )
    assert r_patch.status_code == 200
    assert r_patch.json()["data"]["name"] == "Fairphone 5"

    # Soft delete brand
    r_del = c.delete(f"/api/v1/brands/{brand_id}/")
    assert r_del.status_code == 204
    assert not ShopBrand.objects.filter(id=brand_id).exists()

    # Create accessory option
    r_acc = c.post(
        "/api/v1/accessory-options/",
        {"name": "Stylus Pen", "is_default": False, "sort_order": 10},
        format="json",
    )
    assert r_acc.status_code == 201
    acc_id = r_acc.json()["data"]["id"]

    # Delete accessory option
    r_del_acc = c.delete(f"/api/v1/accessory-options/{acc_id}/")
    assert r_del_acc.status_code == 204
    assert not AccessoryOption.objects.filter(id=acc_id).exists()


def test_other_shop_brand_hidden(world, client_for):
    """Cross-tenant isolation: Shop A cannot see or edit Shop B brand."""
    brand_b = ShopBrand.objects.filter(shop=world.shop_b, name="Apple", device_category="mobile").first()
    assert brand_b is not None

    c_a = client_for(world.owner_a, world.shop_a)
    assert_other_shop_hidden(c_a, f"/api/v1/brands/{brand_b.id}/")


def test_duplicate_brand_rejected(world, client_for):
    """Case-insensitive duplicate brand name in the same category is rejected with 400 fields.name."""
    c = client_for(world.owner_a, world.shop_a)

    # Samsung already exists in mobile
    r = c.post(
        "/api/v1/brands/",
        {"name": "samsung", "device_category": "mobile"},
        format="json",
    )
    assert r.status_code == 400
    res = r.json()
    assert "error" in res
    assert "fields" in res["error"]
    assert "name" in res["error"]["fields"]
    assert "Already exists" in res["error"]["fields"]["name"][0]

    # But "Samsung" in another category where it doesn't exist or a distinct category should work
    r2 = c.post(
        "/api/v1/brands/",
        {"name": "Nothing", "device_category": "laptop"},
        format="json",
    )
    assert r2.status_code == 201
