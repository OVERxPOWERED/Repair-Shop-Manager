"""
Abuse, rate limiting, brute force, and payload size hardening tests.
"""

import pytest
from django.conf import settings
from django.core.exceptions import RequestDataTooBig
from rest_framework import status

from apps.accounts.models import OTPChallenge

pytestmark = pytest.mark.django_db


def test_otp_send_cooldown_rate_limit(client):
    """Sending OTP requests in rapid succession for the same phone triggers 429 cooldown."""
    phone = "+919876543210"
    payload = {"phone": phone}

    # First request succeeds
    resp1 = client.post("/api/v1/auth/otp/send/", payload, format="json")
    assert resp1.status_code == status.HTTP_200_OK

    # Immediate second request fails with 429 cooldown
    resp2 = client.post("/api/v1/auth/otp/send/", payload, format="json")
    assert resp2.status_code == status.HTTP_429_TOO_MANY_REQUESTS
    data = resp2.json() if hasattr(resp2, "json") else resp2.data
    assert data["error"]["code"] == "otp.cooldown"


def test_otp_verify_brute_force_lock(client):
    """Entering wrong OTP code repeatedly locks the challenge against brute force attacks."""
    phone = "+919876543211"
    device_id = "device-abuse-test-1234"

    # Send OTP
    resp = client.post("/api/v1/auth/otp/send/", {"phone": phone, "device_id": device_id}, format="json")
    assert resp.status_code == status.HTTP_200_OK

    challenge = OTPChallenge.objects.filter(phone=phone).order_by("-created_at").first()
    assert challenge is not None
    max_attempts = challenge.max_attempts  # defaults to 5

    # Wrong code attempts up to max_attempts - 1
    for _attempt in range(max_attempts - 1):
        verify_resp = client.post(
            "/api/v1/auth/otp/verify/",
            {"phone": phone, "code": "000000", "device_id": device_id, "platform": "web"},
            format="json",
        )
        assert verify_resp.status_code == status.HTTP_400_BAD_REQUEST
        err_code = verify_resp.json()["error"]["code"]
        assert err_code == "otp.invalid"

    # Final attempt hits max_attempts and locks
    final_resp = client.post(
        "/api/v1/auth/otp/verify/",
        {"phone": phone, "code": "000000", "device_id": device_id, "platform": "web"},
        format="json",
    )
    assert final_resp.status_code == status.HTTP_400_BAD_REQUEST
    assert final_resp.json()["error"]["code"] == "otp.locked"

    # Even with correct code afterwards, challenge is locked
    locked_resp = client.post(
        "/api/v1/auth/otp/verify/",
        {"phone": phone, "code": "123456", "device_id": device_id, "platform": "web"},
        format="json",
    )
    assert locked_resp.status_code == status.HTTP_400_BAD_REQUEST
    assert locked_resp.json()["error"]["code"] == "otp.locked"


def test_tracking_rate_limiting(client):
    """Public tracking page enforces rate limit of 60 requests per minute per IP."""
    token = "a" * 32

    # Perform 60 requests within limit
    for _ in range(60):
        resp = client.get(f"/t/{token}/")
        assert resp.status_code in (status.HTTP_200_OK, status.HTTP_404_NOT_FOUND)

    # 61st request must trigger 429 Too Many Requests
    resp_blocked = client.get(f"/t/{token}/")
    assert resp_blocked.status_code == status.HTTP_429_TOO_MANY_REQUESTS


def test_data_upload_max_memory_size_setting():
    """Verify DATA_UPLOAD_MAX_MEMORY_SIZE is configured to 2.5 MB (2621440 bytes)."""
    assert settings.DATA_UPLOAD_MAX_MEMORY_SIZE == 2621440


def test_oversized_payload_rejection():
    """Accessing request body exceeding DATA_UPLOAD_MAX_MEMORY_SIZE raises RequestDataTooBig."""
    from django.test import RequestFactory

    rf = RequestFactory()
    oversized_data = b"x" * (settings.DATA_UPLOAD_MAX_MEMORY_SIZE + 1024)
    req = rf.post(
        "/api/v1/auth/otp/send/",
        data=oversized_data,
        content_type="application/json",
    )
    with pytest.raises(RequestDataTooBig):
        _ = req.body
