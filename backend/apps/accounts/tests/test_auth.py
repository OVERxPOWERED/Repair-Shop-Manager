"""
Tests for hardened authentication, OTP challenges, device-aware JWT lifecycle, and phone helpers.
"""

import logging
import re
from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import OTPChallenge
from apps.core.phone import mask_phone, normalize_phone

User = get_user_model()
pytestmark = pytest.mark.django_db

TEST = "+919999999999"


def _login(client, device="dev-1"):
    # Clear any previous cooldown
    OTPChallenge.objects.filter(phone=TEST).update(created_at=timezone.now() - timedelta(seconds=35))
    client.post("/api/v1/auth/otp/send/", {"phone": TEST}, format="json")
    r = client.post(
        "/api/v1/auth/otp/verify/",
        {"phone": TEST, "code": "123456", "device_id": device, "platform": "android"},
        format="json",
    )
    return r.json()["data"]["tokens"]


def test_send_otp_normal_number(client):
    phone = "+919876543210"
    r = client.post("/api/v1/auth/otp/send/", {"phone": phone}, format="json")
    assert r.status_code == 200
    challenge = OTPChallenge.objects.filter(phone=phone).first()
    assert challenge is not None
    assert len(challenge.code_hash) == 64
    assert not (len(challenge.code_hash) == 6 and challenge.code_hash.isdigit())


def test_send_twice_quickly(client):
    phone = "+919876543211"
    r1 = client.post("/api/v1/auth/otp/send/", {"phone": phone}, format="json")
    assert r1.status_code == 200
    r2 = client.post("/api/v1/auth/otp/send/", {"phone": phone}, format="json")
    assert r2.status_code == 429
    assert r2.json()["error"]["code"] == "otp.cooldown"
    assert "Retry-After" in r2.headers


def test_hourly_rate_limit(client):
    phone = "+919876543212"
    now = timezone.now()
    for i in range(6):
        r = client.post("/api/v1/auth/otp/send/", {"phone": phone}, format="json")
        assert r.status_code == 200
        OTPChallenge.objects.filter(phone=phone).update(created_at=now - timedelta(seconds=35 * (6 - i)))
    r7 = client.post("/api/v1/auth/otp/send/", {"phone": phone}, format="json")
    assert r7.status_code == 429
    assert r7.json()["error"]["code"] == "otp.too_many_requests"


def test_verify_with_fixed_test_code(client):
    client.post("/api/v1/auth/otp/send/", {"phone": TEST}, format="json")
    r = client.post(
        "/api/v1/auth/otp/verify/",
        {"phone": TEST, "code": "123456", "device_id": "dev-1", "platform": "web"},
        format="json",
    )
    assert r.status_code == 200
    data = r.json()["data"]
    assert "access" in data["tokens"] and "refresh" in data["tokens"]
    assert data["shops"] == []


def test_verify_wrong_code_lock(client):
    client.post("/api/v1/auth/otp/send/", {"phone": TEST}, format="json")
    # 1st wrong attempt
    r1 = client.post(
        "/api/v1/auth/otp/verify/",
        {"phone": TEST, "code": "000000", "device_id": "dev-1", "platform": "web"},
        format="json",
    )
    assert r1.status_code == 400
    assert r1.json()["error"]["code"] == "otp.invalid"

    # 2nd wrong attempt
    r2 = client.post(
        "/api/v1/auth/otp/verify/",
        {"phone": TEST, "code": "000000", "device_id": "dev-1", "platform": "web"},
        format="json",
    )
    assert r2.status_code == 400
    assert r2.json()["error"]["code"] == "otp.invalid"

    # 3rd wrong attempt
    r3 = client.post(
        "/api/v1/auth/otp/verify/",
        {"phone": TEST, "code": "000000", "device_id": "dev-1", "platform": "web"},
        format="json",
    )
    assert r3.status_code == 400
    assert r3.json()["error"]["code"] == "otp.locked"

    # Right code afterwards is rejected
    r4 = client.post(
        "/api/v1/auth/otp/verify/",
        {"phone": TEST, "code": "123456", "device_id": "dev-1", "platform": "web"},
        format="json",
    )
    assert r4.status_code == 400
    assert r4.json()["error"]["code"] == "otp.locked"


def test_attempts_are_persisted(client):
    client.post("/api/v1/auth/otp/send/", {"phone": TEST}, format="json")
    client.post(
        "/api/v1/auth/otp/verify/",
        {"phone": TEST, "code": "000000", "device_id": "dev-1", "platform": "web"},
        format="json",
    )
    challenge = OTPChallenge.objects.filter(phone=TEST).latest("created_at")
    assert challenge.attempts == 1


def test_expired_challenge(client):
    client.post("/api/v1/auth/otp/send/", {"phone": TEST}, format="json")
    challenge = OTPChallenge.objects.filter(phone=TEST).latest("created_at")
    OTPChallenge.objects.filter(pk=challenge.pk).update(expires_at=timezone.now() - timedelta(minutes=1))
    r = client.post(
        "/api/v1/auth/otp/verify/",
        {"phone": TEST, "code": "123456", "device_id": "dev-1", "platform": "web"},
        format="json",
    )
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "otp.expired"


def test_inactive_user(client):
    tokens = _login(client, device="dev-inactive")
    assert tokens
    User.objects.filter(phone=TEST).update(is_active=False)

    OTPChallenge.objects.filter(phone=TEST).update(created_at=timezone.now() - timedelta(seconds=35))
    client.post("/api/v1/auth/otp/send/", {"phone": TEST}, format="json")
    r = client.post(
        "/api/v1/auth/otp/verify/",
        {"phone": TEST, "code": "123456", "device_id": "dev-inactive", "platform": "web"},
        format="json",
    )
    assert r.status_code == 403
    assert r.json()["error"]["code"] == "auth.account_disabled"


def test_patch_me_cannot_deactivate_self(client):
    tokens = _login(client, device="dev-me")
    c = APIClient()
    c.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
    r = c.patch("/api/v1/auth/me/", {"is_active": False, "name": "New Name"}, format="json")
    assert r.status_code == 200
    data = r.json()["data"]
    assert data["user"]["name"] == "New Name"
    assert data["user"]["is_active"] is True
    user = User.objects.get(phone=TEST)
    assert user.name == "New Name"
    assert user.is_active is True


def test_refresh_reuse_revokes_device(client):
    c = APIClient()
    tokens = _login(c, device="dev-rot")
    r1 = c.post("/api/v1/auth/token/refresh/", {"refresh": tokens["refresh"]}, format="json")
    assert r1.status_code == 200
    new_refresh = r1.json()["data"]["refresh"]

    replay = c.post("/api/v1/auth/token/refresh/", {"refresh": tokens["refresh"]}, format="json")
    assert replay.status_code == 401

    assert c.post("/api/v1/auth/token/refresh/", {"refresh": new_refresh}, format="json").status_code == 401


def test_logout(client):
    c = APIClient()
    tokens = _login(c, device="dev-logout")
    c.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
    r = c.post("/api/v1/auth/logout/")
    assert r.status_code == 204

    r2 = c.get("/api/v1/auth/me/")
    assert r2.status_code == 401


def test_logout_all(client):
    c1 = APIClient()
    tokens1 = _login(c1, device="dev-1")

    c2 = APIClient()
    tokens2 = _login(c2, device="dev-2")

    c1.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens1['access']}")
    r = c1.post("/api/v1/auth/logout-all/")
    assert r.status_code == 204

    c2.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens2['access']}")

    assert c1.get("/api/v1/auth/me/").status_code == 401
    assert c2.get("/api/v1/auth/me/").status_code == 401


def test_device_list(client):
    c = APIClient()
    tokens = _login(c, device="dev-current")
    c.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
    r = c.get("/api/v1/auth/devices/")
    assert r.status_code == 200
    devices = r.json()["data"]
    current = next(d for d in devices if d["device_id"] == "dev-current")
    assert current["is_current"] is True


def test_otp_never_logged_outside_debug(client, caplog, settings):
    settings.DEBUG = False
    phone = "+919876543999"
    with caplog.at_level(logging.INFO):
        r = client.post("/api/v1/auth/otp/send/", {"phone": phone}, format="json")
        assert r.status_code == 200
    for record in caplog.records:
        assert "[DEV SMS]" not in record.message
        assert not re.search(r"\b\d{6}\b", record.message)


def test_phone_helpers():
    assert mask_phone("+919876543210") == "+91XXXXXX3210"
    assert normalize_phone("098765 43210") == "+919876543210"


def test_purge_otp_challenges_command():
    call_command("purge_otp_challenges", "--days=7")
