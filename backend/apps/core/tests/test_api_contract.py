from datetime import date

import pytest

from apps.core.time import financial_year_label, financial_year_start

pytestmark = pytest.mark.django_db


def test_success_is_enveloped(client_for, world):
    r = client_for(world.owner_a).get("/api/v1/auth/me/")
    assert r.status_code == 200
    assert "data" in r.json()


def test_list_has_data_and_meta(client_for, world):
    r = client_for(world.owner_a, world.shop_a).get("/api/v1/staff/")
    body = r.json()
    assert set(body) == {"data", "meta"}
    assert body["meta"]["count"] == 4


def test_401_shape(client):
    r = client.get("/api/v1/auth/me/")
    assert r.status_code == 401
    err = r.json()["error"]
    assert err["code"] == "auth.not_authenticated"
    assert set(err) == {"code", "message", "fields", "request_id"}


def test_request_id_echoed(client):
    r = client.get("/api/v1/health/", HTTP_X_REQUEST_ID="abc12345-test")
    assert r["X-Request-Id"] == "abc12345-test"


def test_unsafe_request_id_replaced(client):
    r = client.get("/api/v1/health/", HTTP_X_REQUEST_ID="<script>")
    assert r["X-Request-Id"] != "<script>"


def test_validation_shape(client_for, world):
    r = client_for(world.owner_a).post("/api/v1/tenancy/onboard/", {}, format="json")
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "validation.failed"
    assert "shop_name" in r.json()["error"]["fields"]


@pytest.mark.parametrize(("d", "fy"), [(date(2027, 3, 31), 2026), (date(2027, 4, 1), 2027), (date(2026, 12, 1), 2026)])
def test_financial_year(d, fy):
    assert financial_year_start(d) == fy


def test_financial_year_label():
    assert financial_year_label(2026) == "26-27"
    assert financial_year_label(2099) == "99-00"
