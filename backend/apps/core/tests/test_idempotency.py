import uuid
from datetime import timedelta

import pytest
from django.core.management import call_command
from django.utils import timezone

from apps.core.models import IdempotencyRecord
from apps.tenancy.models import Shop

pytestmark = pytest.mark.django_db
BODY = {"name": "Idem Shop", "shop_type": "mobile"}


def test_same_key_returns_same_shop(client_for, world):
    c = client_for(world.owner_a)
    key = str(uuid.uuid4())
    r1 = c.post("/api/v1/tenancy/onboard/", BODY, format="json", HTTP_IDEMPOTENCY_KEY=key)
    r2 = c.post("/api/v1/tenancy/onboard/", BODY, format="json", HTTP_IDEMPOTENCY_KEY=key)
    assert r1.status_code == r2.status_code == 201
    assert r1.json() == r2.json()
    assert r2["Idempotent-Replayed"] == "true"
    assert Shop.objects.filter(name="Idem Shop").count() == 1


def test_same_key_different_body_rejected(client_for, world):
    c = client_for(world.owner_a)
    key = str(uuid.uuid4())
    c.post("/api/v1/tenancy/onboard/", BODY, format="json", HTTP_IDEMPOTENCY_KEY=key)
    r = c.post("/api/v1/tenancy/onboard/", {**BODY, "name": "Other"}, format="json", HTTP_IDEMPOTENCY_KEY=key)
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "idempotency.key_reused"


def test_failed_request_can_be_retried_with_same_key(client_for, world):
    c = client_for(world.owner_a)
    key = str(uuid.uuid4())
    assert c.post("/api/v1/tenancy/onboard/", {}, format="json", HTTP_IDEMPOTENCY_KEY=key).status_code == 400
    assert c.post("/api/v1/tenancy/onboard/", {}, format="json", HTTP_IDEMPOTENCY_KEY=key).status_code == 400


def test_bad_key_format(client_for, world):
    r = client_for(world.owner_a).post("/api/v1/tenancy/onboard/", BODY, format="json", HTTP_IDEMPOTENCY_KEY="nope")
    assert r.json()["error"]["code"] == "idempotency.key_invalid"


def test_purge_idempotency_records_command(world):
    old_record = IdempotencyRecord.objects.create(
        user=world.owner_a,
        key=uuid.uuid4(),
        method="POST",
        path="/api/v1/test/",
        request_hash="hash1",
        status_code=200,
    )
    # Set created_at to 50 hours ago
    IdempotencyRecord.objects.filter(pk=old_record.pk).update(created_at=timezone.now() - timedelta(hours=50))

    new_record = IdempotencyRecord.objects.create(
        user=world.owner_a,
        key=uuid.uuid4(),
        method="POST",
        path="/api/v1/test/",
        request_hash="hash2",
        status_code=200,
    )

    call_command("purge_idempotency_records")

    assert not IdempotencyRecord.objects.filter(pk=old_record.pk).exists()
    assert IdempotencyRecord.objects.filter(pk=new_record.pk).exists()
