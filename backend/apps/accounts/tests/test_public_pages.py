import pytest
from django.urls import reverse

from apps.accounts.models import AccountDeletionRequest, OTPChallenge, User


@pytest.mark.django_db
class TestPublicCompliancePages:
    def test_privacy_page_renders(self, client):
        url = reverse("public-privacy-policy")
        resp = client.get(url)
        assert resp.status_code == 200
        assert "Privacy Policy" in resp.content.decode()
        assert "Digital Personal Data Protection Act" in resp.content.decode()

    def test_terms_page_renders(self, client):
        url = reverse("public-terms-of-service")
        resp = client.get(url)
        assert resp.status_code == 200
        assert "Terms of Service" in resp.content.decode()
        assert "CEIR blacklist" in resp.content.decode()

    def test_account_deletion_page_get(self, client):
        url = reverse("public-account-deletion")
        resp = client.get(url)
        assert resp.status_code == 200
        assert "Request Account Deletion" in resp.content.decode()

    def test_account_deletion_page_full_flow(self, client):
        user = User.objects.create_user(phone="+919999999999", name="Delete Me")
        url = reverse("public-account-deletion")

        # Step 1: Send OTP
        resp_step1 = client.post(url, {"step": "send_otp", "phone": "9999999999"})
        assert resp_step1.status_code == 200
        assert "Enter the 6-digit code" in resp_step1.content.decode()

        # Retrieve OTP challenge
        otp = OTPChallenge.objects.filter(
            phone="+919999999999",
            purpose=OTPChallenge.PurposeChoices.DELETE_ACCOUNT,
        ).first()
        assert otp is not None

        # Step 2: Confirm OTP & request deletion
        resp_step2 = client.post(
            url,
            {
                "step": "confirm",
                "phone": "+919999999999",
                "code": "123456",
                "reason": "Closing business",
            },
        )
        assert resp_step2.status_code == 200
        assert "Deletion Request Received" in resp_step2.content.decode()

        # Check DB request
        req = AccountDeletionRequest.objects.filter(user=user).first()
        assert req is not None
        assert req.status == AccountDeletionRequest.StatusChoices.PENDING
        assert req.reason == "Closing business"

    def test_account_deletion_sole_owner_conflict(self, client, settings, world):
        owner = world.owner_a
        settings.OTP_TEST_NUMBERS[owner.phone] = "123456"
        url = reverse("public-account-deletion")

        # Step 1: Send OTP
        client.post(url, {"step": "send_otp", "phone": owner.phone})
        otp = OTPChallenge.objects.filter(
            phone=owner.phone,
            purpose=OTPChallenge.PurposeChoices.DELETE_ACCOUNT,
        ).first()
        assert otp is not None

        # Step 2: Confirm -> triggers conflict
        resp = client.post(
            url,
            {
                "step": "confirm",
                "phone": owner.phone,
                "code": "123456",
                "reason": "Leaving",
            },
        )
        assert resp.status_code == 409
        assert "sole owner" in resp.content.decode()
