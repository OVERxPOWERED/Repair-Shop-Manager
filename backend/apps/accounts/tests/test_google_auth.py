import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.accounts.models import UserDevice
from apps.audit.models import AuditLog

User = get_user_model()
pytestmark = pytest.mark.django_db


@pytest.fixture
def api_client():
    return APIClient()


def test_google_signup_new_user(api_client):
    """A new user signing in with Google gets created without a phone number and receives JWT tokens."""
    token = "test-google-token:google-sub-1001:newuser@gmail.com:Ramesh Sharma"
    res = api_client.post(
        "/api/v1/auth/google/",
        {"id_token": token, "device_id": "phone-device-1", "platform": "android"},
        format="json",
    )
    assert res.status_code == 200
    data = res.json()["data"]

    assert data["user"]["email"] == "newuser@gmail.com"
    assert data["user"]["name"] == "Ramesh Sharma"
    assert data["user"]["phone"] is None
    assert "tokens" in data
    assert "access" in data["tokens"]
    assert "refresh" in data["tokens"]

    user = User.objects.get(google_sub="google-sub-1001")
    assert user.email == "newuser@gmail.com"
    assert user.name == "Ramesh Sharma"
    assert user.phone is None
    assert user.last_login_at is not None

    device = UserDevice.objects.get(user=user, device_id="phone-device-1")
    assert device.platform == "android"
    assert device.revoked_at is None

    audit = AuditLog.objects.filter(action="auth.new_device_login", actor=user).first()
    assert audit is not None
    assert audit.after.get("provider") == "google"


def test_google_login_existing_user(api_client):
    """An existing Google user logging in updates last_login_at and returns tokens."""
    user = User.objects.create_user(
        phone=None, email="existing@gmail.com", google_sub="google-sub-existing", name="Existing User"
    )
    token = "test-google-token:google-sub-existing:existing@gmail.com:Existing User"

    res = api_client.post(
        "/api/v1/auth/google/",
        {"id_token": token, "device_id": "phone-device-2", "platform": "web"},
        format="json",
    )
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["user"]["id"] == str(user.id)

    user.refresh_from_db()
    assert user.last_login_at is not None


def test_google_link_existing_user_by_email(api_client):
    """A user created by email or phone who later signs in with Google has google_sub linked."""
    user = User.objects.create_user(phone="+919876543210", email="unlinked@gmail.com", name="Unlinked User")
    assert user.google_sub is None

    token = "test-google-token:google-sub-linked:unlinked@gmail.com:Unlinked User"
    res = api_client.post(
        "/api/v1/auth/google/",
        {"id_token": token, "device_id": "device-3", "platform": "android"},
        format="json",
    )
    assert res.status_code == 200
    user.refresh_from_db()
    assert user.google_sub == "google-sub-linked"


def test_google_login_disabled_account(api_client):
    """Disabled or soft-deleted accounts cannot sign in via Google."""
    User.objects.create_user(
        phone=None,
        email="disabled@gmail.com",
        google_sub="google-sub-disabled",
        name="Disabled User",
        is_active=False,
    )
    token = "test-google-token:google-sub-disabled:disabled@gmail.com:Disabled User"
    res = api_client.post(
        "/api/v1/auth/google/",
        {"id_token": token, "device_id": "device-4", "platform": "web"},
        format="json",
    )
    assert res.status_code == 403
    assert res.json()["error"]["code"] == "auth.account_disabled"


def test_google_auth_invalid_token(api_client):
    """Invalid or unverified token returns 400."""
    res = api_client.post(
        "/api/v1/auth/google/",
        {"id_token": "definitely-not-valid-jwt", "device_id": "device-5", "platform": "web"},
        format="json",
    )
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "auth.invalid_google_token"


def test_google_user_add_phone_in_profile(api_client):
    """A Google user without a phone can update their phone in profile setup."""
    token = "test-google-token:google-sub-phone:phoneless@gmail.com:Phoneless"
    res = api_client.post(
        "/api/v1/auth/google/",
        {"id_token": token, "device_id": "device-phone", "platform": "web"},
        format="json",
    )
    access_token = res.json()["data"]["tokens"]["access"]

    # PATCH /api/v1/auth/me/
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
    patch_res = api_client.patch(
        "/api/v1/auth/me/",
        {"phone": "9876543299", "name": "Phoneless Updated"},
        format="json",
    )
    assert patch_res.status_code == 200
    user_data = patch_res.json()["data"]["user"]
    assert user_data["phone"] == "+919876543299"
    assert user_data["name"] == "Phoneless Updated"

    # Conflicting phone should be rejected
    User.objects.create_user(phone="+919876543288", email="other@gmail.com")
    conflict_res = api_client.patch(
        "/api/v1/auth/me/",
        {"phone": "9876543288"},
        format="json",
    )
    assert conflict_res.status_code == 400
