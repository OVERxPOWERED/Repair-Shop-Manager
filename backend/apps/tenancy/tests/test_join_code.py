from datetime import timedelta

import pytest
from django.utils import timezone

from apps.accounts.models import User
from apps.audit.models import AuditLog
from apps.tenancy.models import Role

pytestmark = pytest.mark.django_db


def test_owner_can_get_and_configure_join_code(client_for, world):
    c_owner = client_for(world.owner_a, world.shop_a)
    c_eng = client_for(world.engineer_a, world.shop_a)

    # 1. Non-manager receives 403
    r_forbidden = c_eng.get("/api/v1/shops/current/join-code/")
    assert r_forbidden.status_code == 403

    # 2. Owner gets join code (auto-generates if none)
    r_get = c_owner.get("/api/v1/shops/current/join-code/")
    assert r_get.status_code == 200
    data = r_get.json()["data"]
    code = data["join_code"]
    assert code.startswith("FX-")
    assert data["enabled"] is True
    assert data["is_expired"] is False

    # 3. Owner configures join code validity to 24h
    r_post = c_owner.post(
        "/api/v1/shops/current/join-code/",
        {"duration": "24h", "regenerate": True},
        format="json",
    )
    assert r_post.status_code == 200
    new_data = r_post.json()["data"]
    new_code = new_data["join_code"]
    assert new_code.startswith("FX-")
    assert new_data["expires_at"] is not None

    # Audit log recorded
    assert AuditLog.objects.filter(
        action="staff.join_code_updated",
        shop=world.shop_a,
        actor=world.owner_a,
    ).exists()


def test_user_joins_via_code_and_owner_approves(client_for, world):
    c_owner = client_for(world.owner_a, world.shop_a)
    r_code = c_owner.get("/api/v1/shops/current/join-code/")
    join_code = r_code.json()["data"]["join_code"]

    role_engineer = Role.objects.get(organization=None, name="Engineer")

    # New user creates account
    tech_user = User.objects.create_user(email="newtech@example.com", name="Sunil Sharma")
    c_tech = client_for(tech_user)

    # Submit join code
    r_join = c_tech.post("/api/v1/shops/join/", {"code": join_code}, format="json")
    assert r_join.status_code == 201
    join_data = r_join.json()["data"]
    assert join_data["shop_id"] == str(world.shop_a.id)
    assert join_data["status"] == "requested"

    # In /auth/me/, user sees shop in requested status with empty permissions
    r_me = c_tech.get("/api/v1/auth/me/")
    assert r_me.status_code == 200
    shops = r_me.json()["data"]["shops"]
    assert len(shops) == 1
    assert shops[0]["status"] == "requested"
    assert shops[0]["permissions"] == []

    # Owner lists join requests
    r_reqs = c_owner.get("/api/v1/staff/requests/")
    assert r_reqs.status_code == 200
    req_list = r_reqs.json()["data"]
    assert len(req_list) == 1
    assert req_list[0]["user_name"] == "Sunil Sharma"
    req_id = req_list[0]["id"]

    # Owner approves request and assigns Engineer role
    r_approve = c_owner.post(
        f"/api/v1/staff/requests/{req_id}/approve/",
        {"role_id": str(role_engineer.id)},
        format="json",
    )
    assert r_approve.status_code == 200
    assert r_approve.json()["data"]["status"] == "active"

    # Sunil is now an active member with Engineer permissions
    r_me_after = c_tech.get("/api/v1/auth/me/")
    active_shops = r_me_after.json()["data"]["shops"]
    assert active_shops[0]["status"] == "active"
    assert "jobs.view" in active_shops[0]["permissions"]

    # Audit log recorded
    assert AuditLog.objects.filter(
        action="staff.request_approved",
        shop=world.shop_a,
        actor=world.owner_a,
    ).exists()


def test_user_joins_via_code_and_owner_rejects(client_for, world):
    c_owner = client_for(world.owner_a, world.shop_a)
    r_code = c_owner.get("/api/v1/shops/current/join-code/")
    join_code = r_code.json()["data"]["join_code"]

    applicant = User.objects.create_user(email="applicant@example.com", name="Reject Me")
    c_applicant = client_for(applicant)

    r_join = c_applicant.post("/api/v1/shops/join/", {"code": join_code}, format="json")
    assert r_join.status_code == 201

    r_reqs = c_owner.get("/api/v1/staff/requests/")
    req_id = r_reqs.json()["data"][0]["id"]

    # Owner rejects
    r_reject = c_owner.post(f"/api/v1/staff/requests/{req_id}/reject/")
    assert r_reject.status_code == 204

    # Membership status is now removed, not listed in active shops
    r_me = c_applicant.get("/api/v1/auth/me/")
    assert len(r_me.json()["data"]["shops"]) == 0

    assert AuditLog.objects.filter(
        action="staff.request_rejected",
        shop=world.shop_a,
        actor=world.owner_a,
    ).exists()


def test_invalid_or_expired_code(client_for, world):
    user = User.objects.create_user(email="test@example.com", name="Tester")
    c = client_for(user)

    # 1. Invalid code -> 404
    r_inv = c.post("/api/v1/shops/join/", {"code": "INVALID-CODE"}, format="json")
    assert r_inv.status_code == 404
    assert r_inv.json()["error"]["code"] == "join_code.invalid"

    # 2. Expired code -> 400
    world.shop_a.join_code = "FX-EXPR"
    world.shop_a.join_code_expires_at = timezone.now() - timedelta(minutes=5)
    world.shop_a.save()

    r_exp = c.post("/api/v1/shops/join/", {"code": "FX-EXPR"}, format="json")
    assert r_exp.status_code == 400
    assert r_exp.json()["error"]["code"] == "join_code.expired"

    # 3. Disabled code -> 400
    world.shop_a.join_code_expires_at = timezone.now() + timedelta(days=1)
    world.shop_a.join_code_enabled = False
    world.shop_a.save()

    r_dis = c.post("/api/v1/shops/join/", {"code": "FX-EXPR"}, format="json")
    assert r_dis.status_code == 400
    assert r_dis.json()["error"]["code"] == "join_code.disabled"


def test_cannot_assign_owner_role_via_approval(client_for, world):
    c_owner = client_for(world.owner_a, world.shop_a)
    world.shop_a.join_code = "FX-ROLE"
    world.shop_a.join_code_enabled = True
    world.shop_a.join_code_expires_at = None
    world.shop_a.save()

    user = User.objects.create_user(email="sneaky@example.com", name="Sneaky")
    c_user = client_for(user)
    r_join = c_user.post("/api/v1/shops/join/", {"code": "FX-ROLE"}, format="json")
    req_id = r_join.json()["data"]["membership_id"]

    role_owner = Role.objects.get(organization=None, name="Owner")
    r_try = c_owner.post(
        f"/api/v1/staff/requests/{req_id}/approve/",
        {"role_id": str(role_owner.id)},
        format="json",
    )
    assert r_try.status_code == 422
    assert r_try.json()["error"]["code"] == "role.cannot_assign_owner"
