from unittest.mock import patch

import pytest
from rest_framework import status


@pytest.mark.django_db
def test_cron_forbidden_without_secret(client, settings):
    settings.CRON_SECRET = "test-secret"
    res = client.post("/api/v1/internal/cron/purge-otp/")
    assert res.status_code == status.HTTP_403_FORBIDDEN
    assert res.json()["error"]["code"] == "permission.denied"


@pytest.mark.django_db
def test_cron_forbidden_with_wrong_secret(client, settings):
    settings.CRON_SECRET = "test-secret"
    res = client.post(
        "/api/v1/internal/cron/purge-otp/",
        HTTP_X_CRON_SECRET="invalid-secret",
    )
    assert res.status_code == status.HTTP_403_FORBIDDEN
    assert res.json()["error"]["code"] == "permission.denied"


@pytest.mark.django_db
def test_cron_not_found_for_unknown_job(client, settings):
    settings.CRON_SECRET = "test-secret"
    res = client.post(
        "/api/v1/internal/cron/unknown-job/",
        HTTP_X_CRON_SECRET="test-secret",
    )
    assert res.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_cron_executes_purge_otp_job(client, settings):
    settings.CRON_SECRET = "test-secret"
    with patch("apps.core.cron.call_command") as mock_call:
        res = client.post(
            "/api/v1/internal/cron/purge-otp/",
            HTTP_X_CRON_SECRET="test-secret",
        )
        assert res.status_code == status.HTTP_200_OK
        data = res.json().get("data", res.json())
        assert data["job"] == "purge-otp"
        assert data["status"] == "ok"
        mock_call.assert_called_once_with("purge_otp_challenges")


@pytest.mark.django_db
def test_cron_executes_purge_idempotency_job(client, settings):
    settings.CRON_SECRET = "test-secret"
    with patch("apps.core.cron.call_command") as mock_call:
        res = client.post(
            "/api/v1/internal/cron/purge-idempotency/",
            HTTP_X_CRON_SECRET="test-secret",
        )
        assert res.status_code == status.HTTP_200_OK
        data = res.json().get("data", res.json())
        assert data["job"] == "purge-idempotency"
        assert data["status"] == "ok"
        mock_call.assert_called_once_with("purge_idempotency_records")
