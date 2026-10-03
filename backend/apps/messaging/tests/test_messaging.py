import uuid
from unittest.mock import patch

import pytest
from django.utils import timezone

from apps.audit.models import AuditLog
from apps.customers.models import Customer
from apps.devices.models import Device, DeviceIdentifier
from apps.jobs.models import Job, JobCounter, JobStatus
from apps.jobs.services import change_status, create_job
from apps.messaging.models import (
    MessageLog,
    MessageStatusChoices,
    MessageTemplate,
    TemplateChannelChoices,
    TemplateKeyChoices,
)
from apps.messaging.renderer import render_template
from apps.messaging.services import resolve_message_template, send_job_message

pytestmark = pytest.mark.django_db


class RecordingSmsProvider:
    def __init__(self):
        self.sent_messages = []

    def send_otp(self, *, phone: str, code: str) -> None:
        pass

    def send_text(self, *, phone: str, body: str, template_id: str | None = None) -> str:
        self.sent_messages.append({"phone": phone, "body": body, "template_id": template_id})
        return f"rec_msg_{len(self.sent_messages)}"


class FailingSmsProvider:
    def send_otp(self, *, phone: str, code: str) -> None:
        pass

    def send_text(self, *, phone: str, body: str, template_id: str | None = None) -> str:
        raise RuntimeError("Gateway 503 Provider Down")


def make_test_job(world, shop=None, customer=None, status=JobStatus.RECEIVED):
    shop = shop or world.shop_a
    if not customer:
        phone_suffix = uuid.uuid4().int % 100000000
        customer = Customer.objects.create(
            shop=shop,
            name="Aarav Sharma",
            phone=f"+9198{phone_suffix:08d}",
            sms_opt_in=True,
            preferred_locale="en",
        )
    device = Device.objects.create(
        shop=shop,
        customer=customer,
        category="mobile",
        brand_text="Samsung",
        model="Galaxy S23",
    )
    DeviceIdentifier.objects.create(shop=shop, device=device, type="imei1", value="356938035643809")
    counter, _ = JobCounter.objects.get_or_create(shop=shop)
    counter.last_job_no += 1
    counter.save()

    job = Job.objects.create(
        shop=shop,
        job_no=counter.last_job_no,
        customer=customer,
        device=device,
        status=status,
        fault_description="Screen glass broken",
        total_paise=450000,
        received_at=timezone.now(),
        created_by=world.owner_a,
    )
    return job


# 1. Safe Template Renderer Tests
def test_safe_template_renderer_whitelisted_placeholders():
    context = {
        "shop_name": "FixPro Electronics",
        "job_no": "1042",
        "device": "OnePlus 11",
        "status": "In Repair",
        "amount": "2500",
        "link": "https://track.fixpro.in/t/abc123token/",
        "customer_name": "Rohan",
        "otp": "654321",
    }
    template = (
        "Hello {customer_name}, job #{job_no} ({device}) at {shop_name} is {status}. Due: Rs {amount}. Link: {link}"
    )
    rendered = render_template(template, context)

    assert "Hello Rohan" in rendered
    assert "job #1042" in rendered
    assert "OnePlus 11" in rendered
    assert "FixPro Electronics" in rendered
    assert "In Repair" in rendered
    assert "Due: Rs 2500" in rendered
    assert "https://track.fixpro.in/t/abc123token/" in rendered


def test_safe_template_renderer_unknown_and_malicious_placeholders():
    context = {
        "shop_name": "FixPro",
        "job_no": "101",
        "secret": "hidden_token",
    }
    template = "Job #{job_no} at {shop_name}. Unknown: {unknown_field}. Attack: {secret.__class__.__mro__} {obj[0]}"
    rendered = render_template(template, context)

    assert "Job #101 at FixPro." in rendered
    assert "Unknown: ." in rendered
    assert "Attack:  " in rendered


def test_safe_template_renderer_malformed_braces():
    rendered = render_template("Malformed {unclosed template body", {"shop_name": "FixPro"})
    assert "Malformed" in rendered


# 2. Template Fallback Order Tests
def test_template_fallback_order(world):
    shop = world.shop_a
    key = TemplateKeyChoices.JOB_RECEIVED
    channel = TemplateChannelChoices.SMS

    # Clean any existing templates for this test key/channel to test clean fallback
    MessageTemplate.objects.filter(key=key, channel=channel).delete()

    # Create Platform English (Lowest priority fallback)
    platform_en = MessageTemplate.objects.create(
        shop=None, key=key, channel=channel, locale="en", body="Platform English"
    )
    assert resolve_message_template(shop=shop, key=key, channel=channel, locale="hi").id == platform_en.id

    # Create Shop English
    shop_en = MessageTemplate.objects.create(shop=shop, key=key, channel=channel, locale="en", body="Shop English")
    assert resolve_message_template(shop=shop, key=key, channel=channel, locale="hi").id == shop_en.id

    # Create Platform Hindi
    platform_hi = MessageTemplate.objects.create(
        shop=None, key=key, channel=channel, locale="hi", body="Platform Hindi"
    )
    assert resolve_message_template(shop=shop, key=key, channel=channel, locale="hi").id == platform_hi.id

    # Create Shop Hindi (Highest priority)
    shop_hi = MessageTemplate.objects.create(shop=shop, key=key, channel=channel, locale="hi", body="Shop Hindi")
    assert resolve_message_template(shop=shop, key=key, channel=channel, locale="hi").id == shop_hi.id


# 3. Customer Opt-In / Phone Missing Tests
def test_customer_opted_out_creates_skipped_log(world):
    job = make_test_job(world)
    job.customer.sms_opt_in = False
    job.customer.save()

    log = send_job_message(job=job, key="job_received", channel="sms")
    assert log is not None
    assert log.status == MessageStatusChoices.SKIPPED
    assert log.error_code == "sms_opted_out"
    assert log.to_phone_masked.startswith("+91")
    assert "XXXXXX" in log.to_phone_masked


def test_customer_without_phone_creates_skipped_log(world):
    job = make_test_job(world)
    job.customer.phone = ""
    job.customer.save()

    log = send_job_message(job=job, key="job_received", channel="sms")
    assert log is not None
    assert log.status == MessageStatusChoices.SKIPPED
    assert log.error_code == "no_phone"
    assert log.to_phone_masked == "N/A"


# 4. Message Log Masking
def test_message_log_stores_masked_phone_never_raw(world):
    job = make_test_job(world)
    raw_phone = "+919876543210"
    job.customer.phone = raw_phone
    job.customer.save()

    log = send_job_message(job=job, key="job_received", channel="sms")
    assert log is not None
    assert log.to_phone_masked == "+91XXXXXX3210"

    # Verify directly from DB
    reloaded_log = MessageLog.objects.get(id=log.id)
    assert reloaded_log.to_phone_masked == "+91XXXXXX3210"
    assert raw_phone not in reloaded_log.to_phone_masked


# 5. Fake Provider Records Rendered Body in Hindi
def test_fake_provider_records_hindi_message(world, django_capture_on_commit_callbacks):
    job = make_test_job(world)
    job.customer.preferred_locale = "hi"
    job.customer.save()

    recorder = RecordingSmsProvider()
    with (
        patch("apps.messaging.services.get_sms_provider", return_value=recorder),
        django_capture_on_commit_callbacks(execute=True),
    ):
        log = send_job_message(job=job, key="job_received", channel="sms")

    assert len(recorder.sent_messages) == 1
    sent = recorder.sent_messages[0]
    assert sent["phone"] == job.customer.phone
    # Check that Hindi text was rendered
    assert "मरम्मत के लिए" in sent["body"] or "प्राप्त हुआ" in sent["body"]
    assert job.device.brand_text in sent["body"]
    assert str(job.job_no) in sent["body"]

    # Verify log was marked sent
    log.refresh_from_db()
    assert log.status == MessageStatusChoices.SENT
    assert log.provider_message_id == "rec_msg_1"
    assert log.sent_at is not None


# 6. Provider Failure Updates Log Without Breaking Transaction
def test_provider_failure_updates_log_failed_without_breaking_transaction(world, django_capture_on_commit_callbacks):
    job = make_test_job(world)
    failing_provider = FailingSmsProvider()

    with (
        patch("apps.messaging.services.get_sms_provider", return_value=failing_provider),
        django_capture_on_commit_callbacks(execute=True),
    ):
        log = send_job_message(job=job, key="job_received", channel="sms")

    log.refresh_from_db()
    assert log.status == MessageStatusChoices.FAILED
    assert "Gateway 503" in log.error_code


# 7. Automatic SMS Events
def test_automatic_sms_events_on_job_created(world, django_capture_on_commit_callbacks):
    recorder = RecordingSmsProvider()
    world.shop_a.auto_sms_events = ["job_received"]
    world.shop_a.save()

    with (
        patch("apps.messaging.services.get_sms_provider", return_value=recorder),
        django_capture_on_commit_callbacks(execute=True),
    ):
        job = create_job(
            shop=world.shop_a,
            actor=world.owner_a,
            membership=world.membership_owner_a,
            data={
                "new_customer": {"name": "Pooja", "phone": "+919811122233"},
                "new_device": {"category": "mobile", "model": "iPhone 14"},
                "fault_description": "Broken screen",
            },
        )

    assert len(recorder.sent_messages) == 1
    assert recorder.sent_messages[0]["phone"] == "+919811122233"
    assert str(job.job_no) in recorder.sent_messages[0]["body"]


def test_automatic_sms_events_disabled_does_not_send(world, django_capture_on_commit_callbacks):
    recorder = RecordingSmsProvider()
    world.shop_a.auto_sms_events = []
    world.shop_a.save()

    with (
        patch("apps.messaging.services.get_sms_provider", return_value=recorder),
        django_capture_on_commit_callbacks(execute=True),
    ):
        create_job(
            shop=world.shop_a,
            actor=world.owner_a,
            membership=world.membership_owner_a,
            data={
                "new_customer": {"name": "Karan", "phone": "+919811122244"},
                "new_device": {"category": "mobile", "model": "Pixel 6"},
                "fault_description": "Speaker issue",
            },
        )

    assert len(recorder.sent_messages) == 0


def test_automatic_sms_events_on_status_change(world, django_capture_on_commit_callbacks):
    recorder = RecordingSmsProvider()
    world.shop_a.auto_sms_events = ["ready_for_pickup", "delivered"]
    world.shop_a.save()

    job = make_test_job(world, status=JobStatus.RECEIVED)
    # Move through flow: RECEIVED -> DIAGNOSING -> IN_REPAIR -> REPAIRED -> READY_FOR_PICKUP
    for st in [JobStatus.DIAGNOSING, JobStatus.IN_REPAIR, JobStatus.REPAIRED]:
        job.status = st
        job.save()

    with (
        patch("apps.messaging.services.get_sms_provider", return_value=recorder),
        django_capture_on_commit_callbacks(execute=True),
    ):
        change_status(
            job=job,
            to_status=JobStatus.READY_FOR_PICKUP,
            actor=world.owner_a,
            membership=world.membership_owner_a,
        )

    assert len(recorder.sent_messages) == 1
    assert "ready for pickup" in recorder.sent_messages[0]["body"].lower()

    # Move to DELIVERED
    with (
        patch("apps.messaging.services.get_sms_provider", return_value=recorder),
        django_capture_on_commit_callbacks(execute=True),
    ):
        change_status(
            job=job,
            to_status=JobStatus.DELIVERED,
            actor=world.owner_a,
            membership=world.membership_owner_a,
        )

    assert len(recorder.sent_messages) == 2
    assert "delivered" in recorder.sent_messages[1]["body"].lower()


# 8. API Endpoints: GET /jobs/{id}/messages/ and POST /jobs/{id}/messages/send/
def test_job_messages_endpoint_permissions_and_scoping(world, client_for):
    job = make_test_job(world)
    send_job_message(job=job, key="job_received", channel="sms")
    send_job_message(job=job, key="status_update", channel="sms")

    # Owner has permission
    client_owner = client_for(world.owner_a, world.shop_a)
    r = client_owner.get(f"/api/v1/jobs/{job.id}/messages/")
    assert r.status_code == 200
    data = r.json()["data"]
    assert len(data) >= 2
    assert "to_phone_masked" in data[0]
    assert "XXXXXX" in data[0]["to_phone_masked"]

    # Engineer has jobs.view permission
    client_eng = client_for(world.engineer_a, world.shop_a)
    r = client_eng.get(f"/api/v1/jobs/{job.id}/messages/")
    assert r.status_code == 200

    # Tenant isolation: Shop B owner gets 404
    client_b = client_for(world.owner_b, world.shop_b)
    r = client_b.get(f"/api/v1/jobs/{job.id}/messages/")
    assert r.status_code == 404


def test_job_send_message_endpoint(world, client_for, django_capture_on_commit_callbacks):
    job = make_test_job(world)
    recorder = RecordingSmsProvider()
    client_owner = client_for(world.owner_a, world.shop_a)

    with (
        patch("apps.messaging.services.get_sms_provider", return_value=recorder),
        django_capture_on_commit_callbacks(execute=True),
    ):
        r = client_owner.post(
            f"/api/v1/jobs/{job.id}/messages/send/",
            {"key": "job_received", "channel": "sms"},
            format="json",
        )

    assert r.status_code == 200, r.json()
    data = r.json()["data"]
    assert data["template_key"] == "job_received"
    assert data["channel"] == "sms"
    assert data["status"] in (MessageStatusChoices.QUEUED, MessageStatusChoices.SENT)

    # Verify that on_commit executed and updated DB record to sent
    log = MessageLog.objects.get(id=data["id"])
    assert log.status == MessageStatusChoices.SENT
    assert log.provider_message_id == "rec_msg_1"

    # Audit row was recorded
    audit = AuditLog.objects.filter(shop=world.shop_a, action="job.message_sent").first()
    assert audit is not None
    assert audit.entity_id == str(job.id)


# 9. API Endpoints: GET/PATCH /message-templates/
def test_message_templates_viewset(world, client_for):
    client_owner = client_for(world.owner_a, world.shop_a)
    client_eng = client_for(world.engineer_a, world.shop_a)

    # Engineer cannot manage shop.settings -> 403
    r = client_eng.get("/api/v1/message-templates/")
    assert r.status_code == 403

    # Owner can list message templates
    r = client_owner.get("/api/v1/message-templates/")
    assert r.status_code == 200
    templates = r.json()["data"]
    assert len(templates) > 0

    # Find a WhatsApp template and an SMS template
    wa_template = next(t for t in templates if t["channel"] == "whatsapp")
    sms_template = next(t for t in templates if t["channel"] == "sms")

    # Try modifying SMS template -> must fail with 400 validation error (TRAI DLT)
    r_sms = client_owner.patch(
        f"/api/v1/message-templates/{sms_template['id']}/",
        {"body": "Directly hacked SMS body"},
        format="json",
    )
    assert r_sms.status_code == 400
    assert "DLT regulations" in str(r_sms.json())

    # Modifying WhatsApp template -> succeeds and creates shop override
    new_wa_body = "Customized WhatsApp greeting: {customer_name}, repair #{job_no} at {shop_name}."
    r_wa = client_owner.patch(
        f"/api/v1/message-templates/{wa_template['id']}/",
        {"body": new_wa_body},
        format="json",
    )
    assert r_wa.status_code == 200
    wa_data = r_wa.json()["data"]
    assert wa_data["body"] == new_wa_body
    assert wa_data["is_override"] is True

    # Audit logged
    assert AuditLog.objects.filter(shop=world.shop_a, action="shop.message_template_updated").exists()
