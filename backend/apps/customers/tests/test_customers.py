import pytest

from apps.audit.models import AuditLog
from apps.core.testing import assert_other_shop_hidden
from apps.customers.models import Customer

pytestmark = pytest.mark.django_db


def test_customer_crud_lifecycle(world, client_for):
    c = client_for(world.owner_a, world.shop_a)

    # 1. Create
    r = c.post(
        "/api/v1/customers/",
        {
            "name": "Rahul Sharma",
            "phone": "+919876543210",
            "notes": "VIP customer",
            "preferred_locale": "hi",
        },
        format="json",
    )
    assert r.status_code == 201, r.json()
    cust_id = r.json()["data"]["id"]
    assert r.json()["data"]["name"] == "Rahul Sharma"
    assert r.json()["data"]["phone"] == "+919876543210"
    assert r.json()["data"]["version"] == 1
    assert r.json()["data"]["phone_masked"] is False

    # 2. Retrieve
    r_get = c.get(f"/api/v1/customers/{cust_id}/")
    assert r_get.status_code == 200
    assert r_get.json()["data"]["notes"] == "VIP customer"

    # 3. Update with If-Match
    r_patch = c.patch(
        f"/api/v1/customers/{cust_id}/",
        {"notes": "Frequent VIP"},
        format="json",
        HTTP_IF_MATCH="1",
    )
    assert r_patch.status_code == 200
    assert r_patch.json()["data"]["version"] == 2
    assert r_patch.json()["data"]["notes"] == "Frequent VIP"

    # Verify audit logs
    audit_create = AuditLog.objects.filter(entity_id=cust_id, action="customer.created").first()
    assert audit_create is not None
    assert audit_create.after.get("phone") == "+91XXXXXX3210"  # Never log unmasked phone

    audit_update = AuditLog.objects.filter(entity_id=cust_id, action="customer.updated").first()
    assert audit_update is not None
    assert audit_update.before.get("notes") == "VIP customer"
    assert audit_update.after.get("notes") == "Frequent VIP"

    # 4. Soft delete
    r_del = c.delete(f"/api/v1/customers/{cust_id}/")
    assert r_del.status_code == 204
    assert not Customer.objects.filter(id=cust_id).exists()
    assert Customer.all_objects.filter(id=cust_id).exists()

    audit_del = AuditLog.objects.filter(entity_id=cust_id, action="customer.deleted").first()
    assert audit_del is not None


def test_duplicate_phone_rejected(world, client_for):
    c_a = client_for(world.owner_a, world.shop_a)

    # First customer in Shop A
    r1 = c_a.post("/api/v1/customers/", {"name": "First", "phone": "+919876543210"}, format="json")
    assert r1.status_code == 201

    # Second customer in Shop A with unnormalized format of same phone -> 400
    r2 = c_a.post("/api/v1/customers/", {"name": "Duplicate", "phone": "98765 43210"}, format="json")
    assert r2.status_code == 400
    res = r2.json()
    assert "error" in res
    assert "fields" in res["error"]
    assert "phone" in res["error"]["fields"]
    assert "customer.phone_exists" in res["error"]["fields"]["phone"]

    # Same phone in Shop B -> allowed
    c_b = client_for(world.owner_b, world.shop_b)
    r_b = c_b.post("/api/v1/customers/", {"name": "Shop B Customer", "phone": "+919876543210"}, format="json")
    assert r_b.status_code == 201


def test_search_and_query_budget(world, client_for, django_assert_max_num_queries):
    c = client_for(world.owner_a, world.shop_a)

    c.post("/api/v1/customers/", {"name": "Rahul Sharma", "phone": "+919876543210"}, format="json")
    c.post("/api/v1/customers/", {"name": "Amit Kumar", "phone": "+919123456789"}, format="json")

    # Search with digits (>= 3 digits) -> finds by phone suffix
    r_phone = c.get("/api/v1/customers/?q=3210")
    assert r_phone.status_code == 200
    data = r_phone.json()["data"]
    assert len(data) == 1
    assert data[0]["name"] == "Rahul Sharma"

    # Search with letters -> finds by name
    r_name = c.get("/api/v1/customers/?q=rah")
    assert r_name.status_code == 200
    data = r_name.json()["data"]
    assert len(data) == 1
    assert data[0]["name"] == "Rahul Sharma"

    # Exact phone lookup ?phone=
    r_exact = c.get("/api/v1/customers/?phone=9123456789")
    assert r_exact.status_code == 200
    data = r_exact.json()["data"]
    assert len(data) == 1
    assert data[0]["name"] == "Amit Kumar"

    # Query budget test: check listing with search executes in max 3 queries
    with django_assert_max_num_queries(3):
        c.get("/api/v1/customers/?q=rah")


def test_masking_matrix(world, client_for):
    world.shop_a.mask_phone_for_engineers = True
    world.shop_a.save()

    c_owner = client_for(world.owner_a, world.shop_a)
    r = c_owner.post("/api/v1/customers/", {"name": "Priya", "phone": "+919876543210"}, format="json")
    cust_id = r.json()["data"]["id"]

    # Engineer with mask_phone_for_engineers=True sees masked phone
    c_eng = client_for(world.engineer_a, world.shop_a)
    r_eng = c_eng.get(f"/api/v1/customers/{cust_id}/")
    assert r_eng.status_code == 200
    assert r_eng.json()["data"]["phone"] == "+91XXXXXX3210"
    assert r_eng.json()["data"]["phone_masked"] is True

    # Front Desk sees unmasked phone
    c_fd = client_for(world.front_desk_a, world.shop_a)
    r_fd = c_fd.get(f"/api/v1/customers/{cust_id}/")
    assert r_fd.status_code == 200
    assert r_fd.json()["data"]["phone"] == "+919876543210"
    assert r_fd.json()["data"]["phone_masked"] is False

    # Toggle mask_phone_for_engineers off -> Engineer sees unmasked
    world.shop_a.mask_phone_for_engineers = False
    world.shop_a.save()

    r_eng_unmasked = c_eng.get(f"/api/v1/customers/{cust_id}/")
    assert r_eng_unmasked.status_code == 200
    assert r_eng_unmasked.json()["data"]["phone"] == "+919876543210"
    assert r_eng_unmasked.json()["data"]["phone_masked"] is False


def test_engineer_patch_with_masked_phone_preserves_stored_phone(world, client_for):
    world.shop_a.mask_phone_for_engineers = True
    world.shop_a.save()

    # Grant customers.edit to engineer's role for this test
    engineer_role = world.role_engineer
    engineer_role.permissions = list(set(engineer_role.permissions) | {"customers.edit"})
    engineer_role.save()

    c_owner = client_for(world.owner_a, world.shop_a)
    r = c_owner.post("/api/v1/customers/", {"name": "Rohan", "phone": "+919876543210"}, format="json")
    cust_id = r.json()["data"]["id"]

    c_eng = client_for(world.engineer_a, world.shop_a)
    r_patch = c_eng.patch(
        f"/api/v1/customers/{cust_id}/",
        {"name": "Rohan Sharma", "phone": "+91XXXXXX3210"},
        format="json",
        HTTP_IF_MATCH="1",
    )
    assert r_patch.status_code == 200
    assert r_patch.json()["data"]["name"] == "Rohan Sharma"
    # Masked representation returned to engineer
    assert r_patch.json()["data"]["phone"] == "+91XXXXXX3210"

    # Reload directly from database to verify real number was preserved
    cust = Customer.objects.get(id=cust_id)
    assert cust.phone == "+919876543210"


def test_engineer_cannot_create_and_tenant_isolation(world, client_for):
    c_eng = client_for(world.engineer_a, world.shop_a)

    # Engineer default role lacks customers.create -> 403
    r = c_eng.post("/api/v1/customers/", {"name": "Denied", "phone": "+919876543210"}, format="json")
    assert r.status_code == 403

    # Cross-tenant isolation
    c_b = client_for(world.owner_b, world.shop_b)
    r_b = c_b.post("/api/v1/customers/", {"name": "Shop B Customer", "phone": "+919876543211"}, format="json")
    cust_b_id = r_b.json()["data"]["id"]

    # Shop A client should get 404 for GET, PATCH, DELETE
    c_a = client_for(world.owner_a, world.shop_a)
    assert_other_shop_hidden(c_a, f"/api/v1/customers/{cust_b_id}/")
