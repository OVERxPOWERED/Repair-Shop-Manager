import pytest
from django.conf import settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient


@pytest.mark.django_db
def test_health_check_endpoint():
    """Verify the health check endpoint returns 200 OK and expected envelope."""
    client = APIClient()
    url = reverse("core:health-check")

    response = client.get(url)

    assert response.status_code == status.HTTP_200_OK
    body = response.json()
    assert "data" in body
    data = body["data"]
    assert data["status"] == "healthy"
    assert data["service"] == "fixpro-api"
    assert data["version"] == settings.APP_VERSION
    assert "timestamp" in data
    assert data["database"] == "connected"
