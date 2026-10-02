"""
Cross-Tenant Isolation and Access Control Test Suite.
Rule 1 of FixPro: Tenant Isolation. Every business table has a shop FK.
Automated cross-tenant tests are mandatory.
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.tenancy.models import Membership, Role
from apps.tenancy.services import create_organization_and_shop, seed_system_roles

User = get_user_model()


@pytest.mark.django_db
class TestTenantIsolation:
    def setup_method(self):
        self.client = APIClient()
        seed_system_roles()

        # 1. Shop A Owned by User A
        self.user_a = User.objects.create_user(phone="+919000000001", name="Owner A")
        self.org_a, self.shop_a, self.mem_a = create_organization_and_shop(
            owner_user=self.user_a, org_name="Apex Repairs Org", shop_name="Apex Repairs Main Branch"
        )

        # 2. Shop B Owned by User B
        self.user_b = User.objects.create_user(phone="+919000000002", name="Owner B")
        self.org_b, self.shop_b, self.mem_b = create_organization_and_shop(
            owner_user=self.user_b, org_name="Beacon Tech Org", shop_name="Beacon Electronics"
        )

        # 3. Staff Engineer in Shop A
        self.tech_a = User.objects.create_user(phone="+919000000003", name="Technician A")
        engineer_role = Role.objects.get(organization=None, name="Engineer")
        self.mem_tech_a = Membership.objects.create(
            user=self.tech_a,
            shop=self.shop_a,
            role=engineer_role,
            status=Membership.StatusChoices.ACTIVE,
            display_name="Tech 1",
        )

    def test_missing_shop_header_rejected(self):
        """Requests to scoped endpoints without X-Shop-Id must be rejected with 400 Bad Request."""
        self.client.force_authenticate(user=self.user_a)
        response = self.client.get("/api/v1/staff/")
        assert response.status_code == 400
        assert response.json()["error"]["code"] == "shop.header_missing"

    def test_invalid_shop_uuid_rejected(self):
        """Malformed shop header must return 400 Bad Request."""
        self.client.force_authenticate(user=self.user_a)
        response = self.client.get("/api/v1/staff/", HTTP_X_SHOP_ID="invalid-uuid-123")
        assert response.status_code == 400
        assert response.json()["error"]["code"] == "shop.header_invalid"

    def test_nonexistent_shop_returns_404(self):
        """Querying a non-existent shop UUID returns 404 Not Found."""
        self.client.force_authenticate(user=self.user_a)
        random_uuid = "00000000-0000-0000-0000-000000000000"
        response = self.client.get("/api/v1/staff/", HTTP_X_SHOP_ID=random_uuid)
        assert response.status_code == 404
        assert response.json()["error"]["code"] == "shop.not_found"

    def test_cross_tenant_access_strictly_forbidden(self):
        """User A must NOT be able to access Shop B resources, returning 404 Not Found."""
        self.client.force_authenticate(user=self.user_a)
        response = self.client.get("/api/v1/staff/", HTTP_X_SHOP_ID=str(self.shop_b.id))
        assert response.status_code == 404
        assert response.json()["error"]["code"] == "shop.not_found"

    def test_same_tenant_access_permitted_and_scoped(self):
        """User A accessing Shop A sees only Shop A members, not Shop B members."""
        self.client.force_authenticate(user=self.user_a)
        response = self.client.get("/api/v1/staff/", HTTP_X_SHOP_ID=str(self.shop_a.id))
        assert response.status_code == 200

        member_ids = [m["user_phone"] for m in response.json()["data"]]
        assert self.user_a.phone in member_ids
        assert self.tech_a.phone in member_ids
        assert self.user_b.phone not in member_ids

    def test_suspended_membership_denied_access(self):
        """Suspended staff members must be denied access with 404 Not Found."""
        self.mem_tech_a.status = Membership.StatusChoices.SUSPENDED
        self.mem_tech_a.save()

        self.client.force_authenticate(user=self.tech_a)
        response = self.client.get("/api/v1/staff/", HTTP_X_SHOP_ID=str(self.shop_a.id))
        assert response.status_code == 404
        assert response.json()["error"]["code"] == "shop.not_found"

    def test_role_permission_enforcement(self):
        """Technician lacking 'staff.view' or higher permission cannot access restricted views."""
        # Create a custom role with no permissions
        restricted_role = Role.objects.create(organization=self.org_a, name="Restricted Observer", permissions=[])
        self.mem_tech_a.role = restricted_role
        self.mem_tech_a.save()

        self.client.force_authenticate(user=self.tech_a)
        response = self.client.get("/api/v1/staff/", HTTP_X_SHOP_ID=str(self.shop_a.id))
        assert response.status_code == 403
        assert response.json()["error"]["code"] == "permission.denied"

    def test_onboard_shop_creates_organization_and_owner_membership(self):
        """User can onboard a new shop and automatically become Owner."""
        new_user = User.objects.create_user(phone="+919555555555", name="New Owner")
        self.client.force_authenticate(user=new_user)

        response = self.client.post(
            "/api/v1/tenancy/onboard/",
            {
                "organization_name": "Super Fix HQ",
                "shop_name": "Super Fix Indiranagar",
                "shop_type": "mobile",
                "city": "Bengaluru",
                "gst_enabled": True,
                "gstin": "29ABCDE1234F1Z5",
            },
        )

        assert response.status_code == 201
        data = response.json()["data"]
        assert data["shop"]["name"] == "Super Fix Indiranagar"
        assert data["shop"]["gst_enabled"] is True
        assert data["membership"]["role_name"] == "Owner"

        # Verify shop exists in user's shops list
        shops_response = self.client.get("/api/v1/shops/")
        assert shops_response.status_code == 200
        shop_names = [s["name"] for s in shops_response.json()["data"]]
        assert "Super Fix Indiranagar" in shop_names
