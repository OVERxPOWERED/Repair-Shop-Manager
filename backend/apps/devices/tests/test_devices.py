import pytest

from apps.core.testing import assert_other_shop_hidden
from apps.core.validators import validate_imei_luhn
from apps.customers.models import Customer
from apps.devices.models import Device, DeviceIdentifier

pytestmark = pytest.mark.django_db


def test_python_luhn_matches_canonical_test_imeis():
    """Validates the two canonical test IMEIs agree with Python validate_imei_luhn."""
    validate_imei_luhn("490154203237518")
    validate_imei_luhn("356938035643809")


def test_imei_validation_matrix(world, client_for):
    c = client_for(world.owner_a, world.shop_a)
    cust = Customer.objects.create(shop=world.shop_a, name="Ramesh", phone="+919876543210")

    # 1. Valid IMEI 490154203237518 -> luhn_valid=True
    r_valid = c.post(
        "/api/v1/devices/",
        {
            "customer_id": str(cust.id),
            "category": "mobile",
            "model": "Galaxy S23",
            "identifiers": [{"type": "imei1", "value": "490154203237518"}],
        },
        format="json",
    )
    assert r_valid.status_code == 201, r_valid.json()
    dev_id = r_valid.json()["data"]["id"]
    ident = DeviceIdentifier.objects.get(device_id=dev_id, type="imei1")
    assert ident.luhn_valid is True

    # 2. Bad check digit without confirm_invalid -> 400 imei.invalid_check_digit
    # 490154203237518 check digit is 8; change to 0
    r_bad = c.post(
        "/api/v1/devices/",
        {
            "customer_id": str(cust.id),
            "category": "mobile",
            "model": "Galaxy S23",
            "identifiers": [{"type": "imei1", "value": "490154203237510"}],
        },
        format="json",
    )
    assert r_bad.status_code == 400
    res_bad = r_bad.json()
    assert res_bad["error"]["code"] == "imei.invalid_check_digit"

    # 3. Bad check digit with confirm_invalid=True -> 201 and luhn_valid=False
    r_confirm = c.post(
        "/api/v1/devices/",
        {
            "customer_id": str(cust.id),
            "category": "mobile",
            "model": "Galaxy S23",
            "identifiers": [{"type": "imei1", "value": "490154203237510", "confirm_invalid": True}],
        },
        format="json",
    )
    assert r_confirm.status_code == 201, r_confirm.json()
    dev_confirm_id = r_confirm.json()["data"]["id"]
    ident_confirm = DeviceIdentifier.objects.get(device_id=dev_confirm_id, type="imei1")
    assert ident_confirm.luhn_valid is False

    # 4. 14 digits -> 400 imei.invalid_format
    r_14 = c.post(
        "/api/v1/devices/",
        {
            "customer_id": str(cust.id),
            "category": "mobile",
            "model": "Galaxy S23",
            "identifiers": [{"type": "imei1", "value": "49015420323751"}],
        },
        format="json",
    )
    assert r_14.status_code == 400
    assert r_14.json()["error"]["code"] == "imei.invalid_format"


def test_two_imeis_and_duplicate_type_rejected(world, client_for):
    c = client_for(world.owner_a, world.shop_a)
    cust = Customer.objects.create(shop=world.shop_a, name="Suresh", phone="+919876543211")

    # Dual SIM device: two valid IMEIs on one device -> 201
    r_dual = c.post(
        "/api/v1/devices/",
        {
            "customer_id": str(cust.id),
            "category": "mobile",
            "model": "iPhone 15",
            "identifiers": [
                {"type": "imei1", "value": "490154203237518"},
                {"type": "imei2", "value": "356938035643809"},
            ],
        },
        format="json",
    )
    assert r_dual.status_code == 201, r_dual.json()
    dev_id = r_dual.json()["data"]["id"]
    idents = DeviceIdentifier.objects.filter(device_id=dev_id)
    assert idents.count() == 2

    # Duplicate type on one device -> 400
    r_dup_type = c.post(
        "/api/v1/devices/",
        {
            "customer_id": str(cust.id),
            "category": "mobile",
            "model": "iPhone 15",
            "identifiers": [
                {"type": "imei1", "value": "490154203237518"},
                {"type": "imei1", "value": "356938035643809"},
            ],
        },
        format="json",
    )
    assert r_dup_type.status_code == 400


def test_customer_from_other_shop_rejected(world, client_for):
    cust_b = Customer.objects.create(shop=world.shop_b, name="Shop B Customer", phone="+919876543299")

    # Shop A client tries to create device for Shop B customer
    c_a = client_for(world.owner_a, world.shop_a)
    r = c_a.post(
        "/api/v1/devices/",
        {
            "customer_id": str(cust_b.id),
            "category": "mobile",
            "model": "Pixel 8",
            "identifiers": [{"type": "imei1", "value": "490154203237518"}],
        },
        format="json",
    )
    assert r.status_code == 400
    assert "customer_id" in r.json()["error"]["fields"]


def test_search_by_imei_suffix_and_tenant_isolation(world, client_for):
    cust_a = Customer.objects.create(shop=world.shop_a, name="Customer A", phone="+919876543201")
    cust_b = Customer.objects.create(shop=world.shop_b, name="Customer B", phone="+919876543202")

    c_a = client_for(world.owner_a, world.shop_a)
    c_b = client_for(world.owner_b, world.shop_b)

    # Device in Shop A with IMEI ending in 7518
    r_dev_a = c_a.post(
        "/api/v1/devices/",
        {
            "customer_id": str(cust_a.id),
            "category": "mobile",
            "model": "OnePlus 12",
            "identifiers": [{"type": "imei1", "value": "490154203237518"}],
        },
        format="json",
    )
    assert r_dev_a.status_code == 201
    dev_a_id = r_dev_a.json()["data"]["id"]

    # Device in Shop B with same IMEI
    r_dev_b = c_b.post(
        "/api/v1/devices/",
        {
            "customer_id": str(cust_b.id),
            "category": "mobile",
            "model": "OnePlus 12",
            "identifiers": [{"type": "imei1", "value": "490154203237518"}],
        },
        format="json",
    )
    assert r_dev_b.status_code == 201
    dev_b_id = r_dev_b.json()["data"]["id"]

    # Query ?imei=7518 in Shop A
    r_search_a = c_a.get("/api/v1/devices/?imei=7518")
    assert r_search_a.status_code == 200
    data = r_search_a.json()["data"]
    assert len(data) == 1
    assert data[0]["id"] == dev_a_id

    # Lookup action /devices/imei-lookup/?value=490154203237518 in Shop A
    r_lookup_a = c_a.get("/api/v1/devices/imei-lookup/?value=490154203237518")
    assert r_lookup_a.status_code == 200
    lookup_data = r_lookup_a.json()["data"]
    assert lookup_data["luhn_valid"] is True
    assert len(lookup_data["matches"]) == 1
    assert lookup_data["matches"][0]["device_id"] == dev_a_id
    assert lookup_data["matches"][0]["customer_name"] == "Customer A"

    # Cross-tenant isolation on detail endpoint
    assert_other_shop_hidden(c_a, f"/api/v1/devices/{dev_b_id}/")


def test_device_crud_and_soft_delete(world, client_for):
    c = client_for(world.owner_a, world.shop_a)
    cust = Customer.objects.create(shop=world.shop_a, name="Pooja", phone="+919876543203")

    # 1. Create
    r = c.post(
        "/api/v1/devices/",
        {
            "customer_id": str(cust.id),
            "category": "mobile",
            "model": "Redmi Note 12",
            "color": "Blue",
            "identifiers": [{"type": "imei1", "value": "490154203237518"}],
        },
        format="json",
    )
    assert r.status_code == 201
    dev_id = r.json()["data"]["id"]

    # 2. Retrieve
    r_get = c.get(f"/api/v1/devices/{dev_id}/")
    assert r_get.status_code == 200
    assert r_get.json()["data"]["color"] == "Blue"
    assert len(r_get.json()["data"]["identifiers"]) == 1

    # 3. Patch with If-Match
    r_patch = c.patch(
        f"/api/v1/devices/{dev_id}/",
        {"color": "Navy Blue"},
        format="json",
        HTTP_IF_MATCH="1",
    )
    assert r_patch.status_code == 200
    assert r_patch.json()["data"]["color"] == "Navy Blue"
    assert r_patch.json()["data"]["version"] == 2

    # 4. Soft delete
    r_del = c.delete(f"/api/v1/devices/{dev_id}/")
    assert r_del.status_code == 204
    assert not Device.objects.filter(id=dev_id).exists()
    assert Device.all_objects.filter(id=dev_id).exists()
