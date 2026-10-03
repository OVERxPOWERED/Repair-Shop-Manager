import pytest
from django.db import DatabaseError, connection

from apps.accounts.models import OTPChallenge, User, UserDevice
from apps.accounts.services import send_otp
from apps.audit.models import AuditLog
from apps.tenancy.models import Role

pytestmark = pytest.mark.django_db


def test_audit_log_append_only_model_and_queryset(world):
    log = AuditLog.objects.create(
        action="test.action",
        shop=world.shop_a,
        actor=world.owner_a,
        before={"x": 1},
        after={"x": 2},
    )

    # Model save on existing instance must fail
    with pytest.raises(RuntimeError, match="append-only"):
        log.action = "tampered"
        log.save()

    # Model delete must fail
    with pytest.raises(RuntimeError, match="append-only"):
        log.delete()

    # QuerySet update must fail
    with pytest.raises(RuntimeError, match="append-only"):
        AuditLog.objects.filter(id=log.id).update(action="tampered")

    # QuerySet delete must fail
    with pytest.raises(RuntimeError, match="append-only"):
        AuditLog.objects.filter(id=log.id).delete()


def test_audit_log_append_only_database_trigger(world):
    from django.db import transaction

    log = AuditLog.objects.create(
        action="test.trigger",
        shop=world.shop_a,
        actor=world.owner_a,
    )

    # Raw SQL UPDATE must be blocked by the PostgreSQL trigger
    with pytest.raises(DatabaseError, match="append-only"), transaction.atomic(), connection.cursor() as cursor:
        cursor.execute(f"UPDATE audit_auditlog SET action = 'hacked' WHERE id = '{log.id}'")

    # Raw SQL DELETE must be blocked by the PostgreSQL trigger
    with pytest.raises(DatabaseError, match="append-only"), transaction.atomic(), connection.cursor() as cursor:
        cursor.execute(f"DELETE FROM audit_auditlog WHERE id = '{log.id}'")


def test_manager_suspending_engineer_records_audit(client_for, world):
    c_mgr = client_for(world.manager_a, world.shop_a)
    r = c_mgr.post(f"/api/v1/staff/{world.membership_engineer_a.id}/suspend/")
    assert r.status_code == 200

    log = AuditLog.objects.filter(
        action="staff.status_changed",
        entity_id=str(world.membership_engineer_a.id),
    ).latest("created_at")

    assert log.shop == world.shop_a
    assert log.actor == world.manager_a
    assert log.before == {"status": "active"}
    assert log.after == {"status": "suspended"}


def test_owner_changing_role_records_audit(client_for, world):
    c_owner = client_for(world.owner_a, world.shop_a)
    old_role_id = str(world.membership_engineer_a.role_id)
    new_role = Role.objects.get(organization=None, name="Front Desk")

    r = c_owner.post(
        f"/api/v1/staff/{world.membership_engineer_a.id}/role/",
        {"role_id": str(new_role.id)},
        format="json",
    )
    assert r.status_code == 200

    log = AuditLog.objects.filter(
        action="staff.role_changed",
        entity_id=str(world.membership_engineer_a.id),
    ).latest("created_at")

    assert log.shop == world.shop_a
    assert log.actor == world.owner_a
    assert log.before == {"role_id": old_role_id}
    assert log.after == {"role_id": str(new_role.id)}


def test_shop_settings_patch_stores_only_changed_keys(client_for, world):
    c_owner = client_for(world.owner_a, world.shop_a)
    old_name = world.shop_a.name

    r = c_owner.patch(
        "/api/v1/shops/current/",
        {"name": "Renamed Repair Shop"},
        HTTP_IF_MATCH=f'"{world.shop_a.version}"',
        format="json",
    )
    assert r.status_code == 200

    log = AuditLog.objects.filter(
        action="shop.settings_updated",
        entity_id=str(world.shop_a.id),
    ).latest("created_at")

    assert log.shop == world.shop_a
    assert log.actor == world.owner_a
    assert "name" in log.before and "name" in log.after
    assert log.before["name"] == old_name
    assert log.after["name"] == "Renamed Repair Shop"
    # Unchanged fields must not be stored in diff
    assert "city" not in log.before
    assert "phone" not in log.before
    assert "gst_enabled" not in log.before


def test_onboard_shop_records_audit(client_for):
    new_user = User.objects.create_user(phone="+919876543210", name="New Owner")
    c = client_for(new_user)

    r = c.post(
        "/api/v1/tenancy/onboard/",
        {
            "name": "Audit Test Workshop",
            "shop_type": "mobile",
            "phone": "+919876543210",
            "gst_enabled": False,
        },
        format="json",
    )
    assert r.status_code == 201
    shop_id = r.json()["data"]["shop"]["id"]

    log = AuditLog.objects.filter(
        action="shop.created",
        entity_id=str(shop_id),
    ).latest("created_at")

    assert log.actor == new_user
    assert str(log.shop_id) == str(shop_id)
    assert log.before is None
    assert log.after == {
        "name": "Audit Test Workshop",
        "shop_type": "mobile",
        "gst_enabled": False,
    }


def test_audit_logs_api_permissions_and_scoping(client_for, world):
    # Create an audit entry in Shop A and Shop B
    log_a = AuditLog.objects.create(
        action="shop.created",
        shop=world.shop_a,
        actor=world.owner_a,
        after={"name": world.shop_a.name},
    )
    log_b = AuditLog.objects.create(
        action="shop.created",
        shop=world.shop_b,
        actor=world.owner_b,
        after={"name": world.shop_b.name},
    )

    # Owner of Shop A -> 200 OK
    c_owner = client_for(world.owner_a, world.shop_a)
    r_owner = c_owner.get("/api/v1/audit-logs/")
    assert r_owner.status_code == 200
    ids = [item["id"] for item in r_owner.json()["data"]]
    assert str(log_a.id) in ids
    # Shop B's logs are never returned
    assert str(log_b.id) not in ids

    # Manager of Shop A -> 403 Forbidden (lacks audit.view)
    c_mgr = client_for(world.manager_a, world.shop_a)
    r_mgr = c_mgr.get("/api/v1/audit-logs/")
    assert r_mgr.status_code == 403
    assert r_mgr.json()["error"]["code"] == "permission.denied"

    # Filter by action
    r_filter = c_owner.get("/api/v1/audit-logs/?action=shop.created")
    assert r_filter.status_code == 200
    for item in r_filter.json()["data"]:
        assert item["action"] == "shop.created"


def test_auth_events_new_device_logout_all_and_revoke():
    from rest_framework.test import APIClient

    client = APIClient()
    phone = "+919999999999"
    send_otp(phone=phone)

    device_id = "test-device-uuid-1"
    # First login on this device -> auth.new_device_login recorded
    r1 = client.post(
        "/api/v1/auth/otp/verify/",
        {
            "phone": phone,
            "code": "123456",
            "device_id": device_id,
            "platform": "android",
        },
        format="json",
    )
    assert r1.status_code == 200
    user_id = r1.json()["data"]["user"]["id"]

    new_device_logs = AuditLog.objects.filter(
        action="auth.new_device_login",
        actor_id=user_id,
    )
    assert new_device_logs.count() == 1
    log = new_device_logs.first()
    assert log.shop is None
    assert log.after == {"platform": "android", "device_id": device_id}

    # Second login on same device -> NOT recorded again
    # Clear challenges or let cooldown pass
    OTPChallenge.objects.filter(phone=phone).delete()
    send_otp(phone=phone)
    r2 = client.post(
        "/api/v1/auth/otp/verify/",
        {
            "phone": phone,
            "code": "123456",
            "device_id": device_id,
            "platform": "android",
        },
        format="json",
    )
    assert r2.status_code == 200
    assert AuditLog.objects.filter(action="auth.new_device_login", actor_id=user_id).count() == 1
    access_token_2 = r2.json()["data"]["tokens"]["access"]

    # Revoke device via DELETE /api/v1/auth/devices/<id>/
    device = UserDevice.objects.get(device_id=device_id)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token_2}")
    r_revoke = client.delete(f"/api/v1/auth/devices/{device.id}/")
    assert r_revoke.status_code == 204

    revoke_log = AuditLog.objects.filter(
        action="auth.device_revoked",
        actor_id=user_id,
    ).latest("created_at")
    assert revoke_log.shop is None
    assert revoke_log.after == {"device_id": device_id}

    # Logout all devices via POST /api/v1/auth/logout-all/
    # Re-login to get a fresh valid token
    OTPChallenge.objects.filter(phone=phone).delete()
    send_otp(phone=phone)
    r3 = client.post(
        "/api/v1/auth/otp/verify/",
        {
            "phone": phone,
            "code": "123456",
            "device_id": device_id,
            "platform": "android",
        },
        format="json",
    )
    access_token_3 = r3.json()["data"]["tokens"]["access"]
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token_3}")

    r_logout_all = client.post("/api/v1/auth/logout-all/")
    assert r_logout_all.status_code == 204

    logout_log = AuditLog.objects.filter(
        action="auth.logout_all",
        actor_id=user_id,
    ).latest("created_at")
    assert logout_log.shop is None
