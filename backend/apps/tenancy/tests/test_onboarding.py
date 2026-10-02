import pytest

from apps.accounts.tests.factories import UserFactory
from apps.tenancy.models import Shop

pytestmark = pytest.mark.django_db


def test_onboarding_happy_path(client_for):
    user = UserFactory()
    c = client_for(user)
    body = {
        "name": "New Fix Shop",
        "shop_type": "mobile",
        "phone": "+919876543210",
        "gst_enabled": False,
    }
    r = c.post("/api/v1/tenancy/onboard/", body, format="json")
    assert r.status_code == 201
    data = r.json()["data"]
    assert "shop" in data
    assert "shops" in data
    assert data["shop"]["name"] == "New Fix Shop"
    assert data["shop"]["registration_type"] == Shop.RegistrationTypeChoices.UNREGISTERED
    assert len(data["shops"]) == 1
    assert data["shops"][0]["role_name"] == "Owner"
