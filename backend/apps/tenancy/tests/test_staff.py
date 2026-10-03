import pytest

from apps.core.testing import assert_other_shop_hidden
from apps.tenancy.models import Membership, Role

pytestmark = pytest.mark.django_db


def test_front_desk_cannot_suspend_owner(client_for, world):
    c = client_for(world.front_desk_a, world.shop_a)
    r = c.post(f"/api/v1/staff/{world.membership_owner_a.id}/suspend/")
    assert r.status_code == 403
    assert r.json()["error"]["code"] == "permission.denied"


def test_manager_cannot_suspend_owner(client_for, world):
    c = client_for(world.manager_a, world.shop_a)
    r = c.post(f"/api/v1/staff/{world.membership_owner_a.id}/suspend/")
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "staff.cannot_modify_owner"


def test_manager_cannot_suspend_self(client_for, world):
    c = client_for(world.manager_a, world.shop_a)
    r = c.post(f"/api/v1/staff/{world.membership_manager_a.id}/suspend/")
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "staff.cannot_modify_self"


def test_manager_suspends_engineer_and_engineer_gets_404(client_for, world):
    c_mgr = client_for(world.manager_a, world.shop_a)
    r = c_mgr.post(f"/api/v1/staff/{world.membership_engineer_a.id}/suspend/")
    assert r.status_code == 200
    assert r.json()["data"]["status"] == Membership.StatusChoices.SUSPENDED

    c_eng = client_for(world.engineer_a, world.shop_a)
    r_eng = c_eng.get("/api/v1/staff/")
    assert r_eng.status_code == 404
    assert r_eng.json()["error"]["code"] == "shop.not_found"


def test_privileged_role_changes(client_for, world):
    c_mgr = client_for(world.manager_a, world.shop_a)
    # Manager changing engineer to Manager (privileged) -> 403 staff.insufficient_rank
    r = c_mgr.post(
        f"/api/v1/staff/{world.membership_engineer_a.id}/role/",
        {"role_id": str(world.role_manager.id)},
        format="json",
    )
    assert r.status_code == 403
    assert r.json()["error"]["code"] == "staff.insufficient_rank"

    # Owner doing the same -> 200
    c_owner = client_for(world.owner_a, world.shop_a)
    r_owner = c_owner.post(
        f"/api/v1/staff/{world.membership_engineer_a.id}/role/",
        {"role_id": str(world.role_manager.id)},
        format="json",
    )
    assert r_owner.status_code == 200
    assert r_owner.json()["data"]["role_name"] == "Manager"


def test_invalid_role_assignments(client_for, world):
    c = client_for(world.owner_a, world.shop_a)

    # Assigning Owner role -> 422 staff.role_not_assignable
    r1 = c.post(
        f"/api/v1/staff/{world.membership_engineer_a.id}/role/",
        {"role_id": str(world.role_owner.id)},
        format="json",
    )
    assert r1.status_code == 422
    assert r1.json()["error"]["code"] == "staff.role_not_assignable"

    # Assigning another organization's role -> 400 staff.role_invalid
    other_org_role = Role.objects.create(organization=world.org_b, name="Org B Role")
    r2 = c.post(
        f"/api/v1/staff/{world.membership_engineer_a.id}/role/",
        {"role_id": str(other_org_role.id)},
        format="json",
    )
    assert r2.status_code == 400
    assert r2.json()["error"]["code"] == "staff.role_invalid"


def test_unsupported_staff_methods(client_for, world):
    c = client_for(world.owner_a, world.shop_a)
    assert c.post("/api/v1/staff/", {}).status_code == 405
    assert c.delete(f"/api/v1/staff/{world.membership_engineer_a.id}/").status_code == 405
    assert c.patch(f"/api/v1/staff/{world.membership_engineer_a.id}/", {}).status_code == 405


def test_removed_member_can_be_re_added(client_for, world):
    c = client_for(world.owner_a, world.shop_a)
    # Remove engineer
    r = c.post(f"/api/v1/staff/{world.membership_engineer_a.id}/remove/")
    assert r.status_code == 204

    # Create new membership for same user and shop (constraint allows it because previous is removed)
    new_m = Membership.objects.create(
        user=world.engineer_a,
        shop=world.shop_a,
        role=world.role_engineer,
        status=Membership.StatusChoices.ACTIVE,
    )
    assert new_m.pk is not None


def test_other_shop_staff_hidden(client_for, world):
    c = client_for(world.owner_a, world.shop_a)
    assert_other_shop_hidden(c, f"/api/v1/staff/{world.membership_owner_b.id}/", methods=("get",))


def test_engineer_can_list_assignable_staff(client_for, world):
    # Engineer does not have staff.view, but has jobs.create -> /staff/ is 403, /staff/assignable/ is 200
    c_eng = client_for(world.engineer_a, world.shop_a)
    assert c_eng.get("/api/v1/staff/").status_code == 403

    r = c_eng.get("/api/v1/staff/assignable/")
    assert r.status_code == 200
    data = r.json()["data"]
    # All members in shop_a who have jobs.change_status (Owner, Manager, Front Desk, Engineer)
    ids = [item["id"] for item in data]
    assert str(world.membership_owner_a.id) in ids
    assert str(world.membership_engineer_a.id) in ids

    # Check payload shape: only {id, display_name, role_name}
    first = data[0]
    assert set(first.keys()) == {"id", "display_name", "role_name"}


def test_assignable_excludes_suspended_and_other_shop(client_for, world):
    # Suspend engineer
    eng_m = world.membership_engineer_a
    eng_m.status = Membership.StatusChoices.SUSPENDED
    eng_m.save()

    c = client_for(world.owner_a, world.shop_a)
    r = c.get("/api/v1/staff/assignable/")
    assert r.status_code == 200
    ids = [item["id"] for item in r.json()["data"]]
    # Suspended engineer is not returned
    assert str(eng_m.id) not in ids
    # Other shop B members are not returned
    assert str(world.membership_owner_b.id) not in ids
