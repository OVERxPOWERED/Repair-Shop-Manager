"""
Tests for authentication, OTP challenges, and JWT lifecycle.
"""

from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import OTPChallenge, UserDevice
from apps.accounts.services import _hash_otp

User = get_user_model()


@pytest.mark.django_db
class TestAuthenticationFlow:
    def setup_method(self):
        self.client = APIClient()
        self.phone = "+919876543210"

    def test_send_otp_success(self):
        response = self.client.post(
            "/api/v1/auth/otp/send/", {"phone": self.phone, "device_id": "test-device-1", "platform": "android"}
        )
        assert response.status_code == 200
        assert "OTP successfully sent" in response.data["data"]["message"]
        assert response.data["data"]["cooldown_seconds"] == 30

        # Verify challenge exists in DB
        challenge = OTPChallenge.objects.filter(phone=self.phone).first()
        assert challenge is not None
        assert challenge.attempts == 0
        assert not challenge.is_consumed

    def test_send_otp_cooldown_enforced(self):
        # First send
        self.client.post("/api/v1/auth/otp/send/", {"phone": self.phone})

        # Immediate second send should fail due to cooldown
        response = self.client.post("/api/v1/auth/otp/send/", {"phone": self.phone})
        assert response.status_code == 400
        assert "Please wait" in response.data["error"]["message"]

    def test_verify_otp_success_provisions_user(self):
        # Create known OTP challenge
        OTPChallenge.objects.create(
            phone=self.phone, code_hash=_hash_otp("123456"), expires_at=timezone.now() + timedelta(minutes=5)
        )

        response = self.client.post(
            "/api/v1/auth/otp/verify/",
            {
                "phone": self.phone,
                "code": "123456",
                "device_id": "phone-uuid-1",
                "platform": "android",
                "app_version": "1.0.0",
            },
        )

        assert response.status_code == 200
        data = response.data["data"]
        assert "tokens" in data
        assert "access" in data["tokens"]
        assert "refresh" in data["tokens"]
        assert data["user"]["phone"] == self.phone

        # Verify user was created
        user = User.objects.get(phone=self.phone)
        assert user.is_active is True
        assert user.last_login_at is not None

        # Verify device was registered
        device = UserDevice.objects.get(user=user, device_id="phone-uuid-1")
        assert device.platform == "android"
        assert device.app_version == "1.0.0"

    def test_verify_otp_invalid_code_decrements_attempts(self):
        challenge = OTPChallenge.objects.create(
            phone=self.phone, code_hash=_hash_otp("654321"), expires_at=timezone.now() + timedelta(minutes=5)
        )

        response = self.client.post("/api/v1/auth/otp/verify/", {"phone": self.phone, "code": "111111"})

        assert response.status_code == 400
        assert "attempt(s) remaining" in response.data["error"]["message"]

        challenge.refresh_from_db()
        assert challenge.attempts == 1

    def test_verify_otp_expired_fails(self):
        OTPChallenge.objects.create(
            phone=self.phone, code_hash=_hash_otp("123456"), expires_at=timezone.now() - timedelta(minutes=1)
        )

        response = self.client.post("/api/v1/auth/otp/verify/", {"phone": self.phone, "code": "123456"})

        assert response.status_code == 400
        assert "expired" in response.data["error"]["message"]

    def test_user_profile_authenticated_access(self):
        user = User.objects.create_user(phone=self.phone, name="Burhanuddin")
        self.client.force_authenticate(user=user)

        response = self.client.get("/api/v1/auth/me/")
        assert response.status_code == 200
        assert response.data["data"]["name"] == "Burhanuddin"
        assert response.data["data"]["phone"] == self.phone
