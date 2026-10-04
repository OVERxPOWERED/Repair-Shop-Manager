"""
Unit and integration tests for Account Deletion lifecycle and compliance.
"""

from datetime import timedelta

import pytest
from django.core.management import call_command
from django.utils import timezone
from rest_framework import status

from apps.accounts.models import AccountDeletionRequest, User, UserDevice
from apps.tenancy.models import Membership, Role

pytestmark = pytest.mark.django_db


def test_request_and_check_account_deletion(world, client_for):
    """User can submit an account deletion request and inspect its pending status."""
    engineer = world.engineer_a
    client = client_for(engineer, world.shop_a)

    # Initially no pending deletion
    resp_initial = client.get("/api/v1/auth/account-deletion/")
    assert resp_initial.status_code == status.HTTP_200_OK
    assert resp_initial.data is None

    # Request deletion
    resp_req = client.post(
        "/api/v1/auth/account-deletion/",
        {"reason": "Closing my shop technician account"},
        format="json",
    )
    assert resp_req.status_code == status.HTTP_201_CREATED
    data = resp_req.data
    assert data["status"] == AccountDeletionRequest.StatusChoices.PENDING
    assert data["reason"] == "Closing my shop technician account"
    assert "scheduled_for" in data

    # Check pending status
    resp_check = client.get("/api/v1/auth/account-deletion/")
    assert resp_check.status_code == status.HTTP_200_OK
    assert resp_check.data["status"] == AccountDeletionRequest.StatusChoices.PENDING


def test_cancel_account_deletion(world, client_for):
    """User can cancel a pending account deletion request during the grace period."""
    engineer = world.engineer_a
    client = client_for(engineer, world.shop_a)

    # Request deletion
    client.post("/api/v1/auth/account-deletion/", {"reason": "Test cancel"}, format="json")

    # Cancel request
    resp_cancel = client.delete("/api/v1/auth/account-deletion/")
    assert resp_cancel.status_code == status.HTTP_200_OK
    assert resp_cancel.data["status"] == AccountDeletionRequest.StatusChoices.CANCELLED

    # Check that no pending request remains
    resp_check = client.get("/api/v1/auth/account-deletion/")
    assert resp_check.status_code == status.HTTP_200_OK
    assert resp_check.data is None


def test_sole_owner_with_active_staff_cannot_delete(world, client_for):
    """Sole owner of a shop with active staff cannot delete account without transferring ownership."""
    owner = world.owner_a
    client = client_for(owner, world.shop_a)

    resp = client.post("/api/v1/auth/account-deletion/", {"reason": "Owner quitting"}, format="json")
    assert resp.status_code == status.HTTP_409_CONFLICT
    assert resp.json()["error"]["code"] == "accounts.sole_owner_conflict"


def test_process_due_account_deletions(world):
    """Processing due deletions anonymizes user, revokes devices, and completes request."""
    user = User.objects.create_user(phone="+919876500001", name="Target To Delete")
    UserDevice.objects.create(user=user, device_id="device-to-delete-1", platform="web")
    membership = Membership.objects.create(
        shop=world.shop_a,
        user=user,
        role=Role.objects.get(organization=None, name="Engineer"),
        status=Membership.StatusChoices.ACTIVE,
    )

    now = timezone.now()
    req = AccountDeletionRequest.objects.create(
        user=user,
        requested_at=now - timedelta(days=8),
        scheduled_for=now - timedelta(hours=1),
        status=AccountDeletionRequest.StatusChoices.PENDING,
        reason="Due for processing",
    )

    # Run management command
    call_command("process_account_deletions")

    req.refresh_from_db()
    assert req.status == AccountDeletionRequest.StatusChoices.COMPLETED
    assert req.completed_at is not None

    user.refresh_from_db()
    assert user.name == "Deleted User"
    assert user.phone != "+919876500001"
    assert user.phone.startswith("+00")
    assert not user.is_active
    assert user.deleted_at is not None

    membership.refresh_from_db()
    assert membership.status == Membership.StatusChoices.REMOVED
