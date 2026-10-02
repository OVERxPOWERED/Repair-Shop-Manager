import pytest

from apps.tenancy.models import Shop

pytestmark = pytest.mark.django_db


def test_my_shops(client_for, world):
    c = client_for(world.owner_a)
    r = c.get("/api/v1/shops/")
    assert r.status_code == 200
    data = r.json()["data"]
    assert len(data) == 1
    assert data[0]["shop_id"] == str(world.shop_a.id)
    assert "permissions" in data[0]
    assert "shop.settings" in data[0]["permissions"]


def test_patch_current_shop_permissions_and_concurrency(client_for, world):
    # Engineer has no shop.settings
    c_eng = client_for(world.engineer_a, world.shop_a)
    r = c_eng.patch("/api/v1/shops/current/", {"name": "New Name"}, format="json", HTTP_IF_MATCH="1")
    assert r.status_code == 403
    assert r.json()["error"]["code"] == "permission.denied"

    # Manager has shop.settings
    c_mgr = client_for(world.manager_a, world.shop_a)

    # Missing If-Match
    r_no_match = c_mgr.patch("/api/v1/shops/current/", {"name": "New Name"}, format="json")
    assert r_no_match.status_code == 428
    assert r_no_match.json()["error"]["code"] == "concurrency.if_match_required"

    # Valid patch with If-Match: 1
    r_valid = c_mgr.patch("/api/v1/shops/current/", {"name": "Updated Shop Name"}, format="json", HTTP_IF_MATCH="1")
    assert r_valid.status_code == 200
    assert r_valid.json()["data"]["name"] == "Updated Shop Name"
    assert r_valid.json()["data"]["version"] == 2

    # Stale If-Match: 1 now that version is 2
    r_stale = c_mgr.patch("/api/v1/shops/current/", {"name": "Stale Name"}, format="json", HTTP_IF_MATCH="1")
    assert r_stale.status_code == 409
    assert r_stale.json()["error"]["code"] == "concurrency.version_mismatch"


def test_disallowed_methods_and_old_route(client_for, world):
    c = client_for(world.owner_a, world.shop_a)
    assert c.delete("/api/v1/shops/current/").status_code == 405
    assert c.patch(f"/api/v1/shops/{world.shop_a.id}/").status_code == 404


def test_gst_validation_rules(client_for, world):
    c = client_for(world.owner_a, world.shop_a)

    # GST on without GSTIN
    r1 = c.patch("/api/v1/shops/current/", {"gst_enabled": True}, format="json", HTTP_IF_MATCH="1")
    assert r1.status_code == 400
    assert "gstin" in r1.json()["error"]["fields"]

    # GST with bad checksum
    r2 = c.patch(
        "/api/v1/shops/current/",
        {"gst_enabled": True, "gstin": "29ABCDE1234F1Z5"},
        format="json",
        HTTP_IF_MATCH="1",
    )
    assert r2.status_code == 400
    assert "gstin" in r2.json()["error"]["fields"]

    # Valid GSTIN sets state_code and registration_type to regular
    r3 = c.patch(
        "/api/v1/shops/current/",
        {"gst_enabled": True, "gstin": "29ABCDE1234F1ZW"},
        format="json",
        HTTP_IF_MATCH="1",
    )
    assert r3.status_code == 200
    data = r3.json()["data"]
    assert data["state_code"] == "29"
    assert data["registration_type"] == Shop.RegistrationTypeChoices.REGULAR
