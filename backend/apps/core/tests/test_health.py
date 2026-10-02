import pytest
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
    assert "data" in response.data
    data = response.data["data"]
    assert data["status"] == "healthy"
    assert data["service"] == "fixpro-api"
    assert data["version"] == "1.0.0"
    assert "timestamp" in data
    assert "database" in data
