from datetime import timedelta

import pytest
from django.utils import timezone

from apps.accounts.models import User
from apps.audit.models import AuditLog
from apps.tenancy.models import Invite, Membership, Role

pytestmark = pytest.mark.django_db


def test_owner_invites_engineer_and_accept_flow(client_for, world):
    c_owner = client_for(world.owner_a, world.shop_a)
    phone = "+919111111111"
    role_engineer = Role.objects.get(organization=None, name="Engineer")

    # 1. Owner creates invite
    r_invite = c_owner.post(
        "/api/v1/invites/",
        {"phone": phone, "role_id": str(role_engineer.id)},
        format="json",
    )
    assert r_invite.status_code == 201
    invite_id = r_invite.json()["data"]["id"]

    # Audit staff.invited logged
    assert AuditLog.objects.filter(
        action="staff.invited",
        shop=world.shop_a,
        actor=world.owner_a,
        after__phone=phone,
    ).exists()

    # 2. User logs in, checks /me/invites/ and /auth/me/
    engineer_user = User.objects.create_user(phone=phone, name="Ramesh Engineer")
    c_eng = client_for(engineer_user)

    r_me = c_eng.get("/api/v1/auth/me/")
    assert r_me.status_code == 200
    assert r_me.json()["data"]["pending_invites"] == 1

    r_invites = c_eng.get("/api/v1/me/invites/")
    assert r_invites.status_code == 200
    data = r_invites.json()["data"]
    assert len(data) == 1
    assert data[0]["id"] == str(invite_id)
    assert data[0]["shop_name"] == world.shop_a.name
    assert data[0]["role_name"] == "Engineer"

    # 3. User accepts invite
    r_accept = c_eng.post(f"/api/v1/me/invites/{invite_id}/accept/")
    assert r_accept.status_code == 200
    shops = r_accept.json()["data"]
    assert len(shops) == 1
    assert shops[0]["shop_name"] == world.shop_a.name
    assert shops[0]["role_name"] == "Engineer"

    # Audit staff.invite_accepted logged
    assert AuditLog.objects.filter(
        action="staff.invite_accepted",
        shop=world.shop_a,
        actor=engineer_user,
    ).exists()

    # 4. User checks GET /shops/
    r_shops = c_eng.get("/api/v1/shops/")
    assert r_shops.status_code == 200
    assert r_shops.json()["data"][0]["role_name"] == "Engineer"

    # 5. User accesses shop endpoints: GET /staff/ -> 403, PATCH /shops/current/ -> 403
    c_eng_shop = client_for(engineer_user, world.shop_a)
    r_staff = c_eng_shop.get("/api/v1/staff/")
    assert r_staff.status_code == 403
    assert r_staff.json()["error"]["code"] == "permission.denied"

    r_patch = c_eng_shop.patch(
        "/api/v1/shops/current/",
        {"name": "Hacked"},
        HTTP_IF_MATCH=f'"{world.shop_a.version}"',
        format="json",
    )
    assert r_patch.status_code == 403
    assert r_patch.json()["error"]["code"] == "permission.denied"


def test_invitation_permissions_and_rank(client_for, world):
    role_mgr = Role.objects.get(organization=None, name="Manager")
    role_eng = Role.objects.get(organization=None, name="Engineer")

    # Front Desk cannot invite anyone -> 403
    c_fd = client_for(world.front_desk_a, world.shop_a)
    r_fd = c_fd.post("/api/v1/invites/", {"phone": "+919444444444", "role_id": str(role_eng.id)}, format="json")
    assert r_fd.status_code == 403
    assert r_fd.json()["error"]["code"] == "permission.denied"

    # Manager cannot invite as Manager (privileged role) -> 403
    c_mgr = client_for(world.manager_a, world.shop_a)
    r_mgr = c_mgr.post("/api/v1/invites/", {"phone": "+919444444444", "role_id": str(role_mgr.id)}, format="json")
    assert r_mgr.status_code == 403
    assert r_mgr.json()["error"]["code"] == "staff.insufficient_rank"

    # Owner can invite as Manager -> 201
    c_owner = client_for(world.owner_a, world.shop_a)
    r_owner = c_owner.post("/api/v1/invites/", {"phone": "+919444444444", "role_id": str(role_mgr.id)}, format="json")
    assert r_owner.status_code == 201


def test_inviting_existing_member_and_deduplication(client_for, world):
    c_owner = client_for(world.owner_a, world.shop_a)
    role_eng = Role.objects.get(organization=None, name="Engineer")
    role_fd = Role.objects.get(organization=None, name="Front Desk")

    # Inviting an existing member -> 409
    r_dup = c_owner.post(
        "/api/v1/invites/",
        {"phone": world.engineer_a.phone, "role_id": str(role_eng.id)},
        format="json",
    )
    assert r_dup.status_code == 409
    assert r_dup.json()["error"]["code"] == "invite.already_member"

    # A second invite revokes the first (only one pending for that phone in that shop)
    phone = "+919555555555"
    r1 = c_owner.post("/api/v1/invites/", {"phone": phone, "role_id": str(role_fd.id)}, format="json")
    assert r1.status_code == 201
    id1 = r1.json()["data"]["id"]

    r2 = c_owner.post("/api/v1/invites/", {"phone": phone, "role_id": str(role_eng.id)}, format="json")
    assert r2.status_code == 201
    id2 = r2.json()["data"]["id"]

    inv1 = Invite.objects.get(id=id1)
    inv2 = Invite.objects.get(id=id2)
    assert inv1.revoked_at is not None
    assert inv2.revoked_at is None
    assert (
        Invite.objects.filter(shop=world.shop_a, phone=phone, accepted_at__isnull=True, revoked_at__isnull=True).count()
        == 1
    )


def test_expired_and_unauthorized_acceptance(client_for, world):
    role_eng = Role.objects.get(organization=None, name="Engineer")
    phone = "+919666666666"

    # Create expired invite directly
    expired_invite = Invite.objects.create(
        shop=world.shop_a,
        phone=phone,
        role=role_eng,
        token_hash="dummy",
        expires_at=timezone.now() - timedelta(minutes=10),
    )

    user = User.objects.create_user(phone=phone)
    c_user = client_for(user)

    r = c_user.post(f"/api/v1/me/invites/{expired_invite.id}/accept/")
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "invite.not_found"

    # Another user trying to accept invite for a different phone -> 404
    active_invite = Invite.objects.create(
        shop=world.shop_a,
        phone=phone,
        role=role_eng,
        token_hash="dummy2",
        expires_at=timezone.now() + timedelta(days=1),
    )
    other_user = User.objects.create_user(phone="+919777777777")
    c_other = client_for(other_user)
    r_other = c_other.post(f"/api/v1/me/invites/{active_invite.id}/accept/")
    assert r_other.status_code == 404
    assert r_other.json()["error"]["code"] == "invite.not_found"


def test_removed_member_can_be_reinvited_and_accept(client_for, world):
    c_owner = client_for(world.owner_a, world.shop_a)
    role_eng = Role.objects.get(organization=None, name="Engineer")

    # Mark engineer as removed
    mem = world.membership_engineer_a
    mem.status = Membership.StatusChoices.REMOVED
    mem.save()

    # Owner can re-invite removed member
    r_invite = c_owner.post(
        "/api/v1/invites/",
        {"phone": world.engineer_a.phone, "role_id": str(role_eng.id)},
        format="json",
    )
    assert r_invite.status_code == 201
    invite_id = r_invite.json()["data"]["id"]

    # Member accepts -> new active membership exists
    c_eng = client_for(world.engineer_a)
    r_accept = c_eng.post(f"/api/v1/me/invites/{invite_id}/accept/")
    assert r_accept.status_code == 200

    new_membership = Membership.objects.filter(
        user=world.engineer_a,
        shop=world.shop_a,
        status=Membership.StatusChoices.ACTIVE,
    ).latest("created_at")
    assert new_membership.id != mem.id


def test_revoke_and_decline_invite(client_for, world):
    c_owner = client_for(world.owner_a, world.shop_a)
    role_eng = Role.objects.get(organization=None, name="Engineer")
    phone1 = "+919888888881"
    phone2 = "+919888888882"

    # Revoke by shop owner
    r1 = c_owner.post("/api/v1/invites/", {"phone": phone1, "role_id": str(role_eng.id)}, format="json")
    inv1_id = r1.json()["data"]["id"]

    r_revoke = c_owner.delete(f"/api/v1/invites/{inv1_id}/")
    assert r_revoke.status_code == 204
    assert Invite.objects.get(id=inv1_id).revoked_at is not None
    assert AuditLog.objects.filter(action="staff.invite_revoked", entity_id=str(inv1_id)).exists()

    # Decline by recipient
    r2 = c_owner.post("/api/v1/invites/", {"phone": phone2, "role_id": str(role_eng.id)}, format="json")
    inv2_id = r2.json()["data"]["id"]

    user2 = User.objects.create_user(phone=phone2)
    c_user2 = client_for(user2)
    r_decline = c_user2.post(f"/api/v1/me/invites/{inv2_id}/decline/")
    assert r_decline.status_code == 204
    assert Invite.objects.get(id=inv2_id).revoked_at is not None
