from django.db import transaction
from django.utils import timezone

from apps.audit.services import record_audit
from apps.core.api.errors import ConflictError, DomainError
from apps.core.crypto import decrypt_str, encrypt_str
from apps.core.phone import normalize_phone
from apps.customers.models import Customer
from apps.devices.services import create_device
from apps.jobs.models import Job, JobAccessory, JobCounter, JobNote, JobStatus, JobStatusHistory


def allocate_job_no(shop) -> int:
    """Must run inside the same transaction as the Job insert (docs/02 §5)."""
    counter, _ = JobCounter.objects.select_for_update().get_or_create(shop=shop)
    counter.last_job_no += 1
    counter.save(update_fields=["last_job_no"])
    return counter.last_job_no


def on_job_created(job: Job) -> None:
    """Hook: extended in 1.11 (advance payment) and 1.19 (intake notification)."""
    pass


@transaction.atomic
def create_job(*, shop, actor, membership, data: dict, request=None) -> Job:
    """
    Creates a new repair job and related models in a single atomic transaction.
    data comes from JobCreateSerializer.validated_data.
    """
    # 1. Customer resolution
    customer = data.get("customer")
    if not customer:
        new_customer_data = data.get("new_customer")
        if not new_customer_data:
            raise DomainError(
                "Either customer_id or new_customer must be provided.",
                code="validation.failed",
                status=400,
            )
        phone = new_customer_data.get("phone")
        if phone:
            clean_phone = normalize_phone(phone)
            existing = Customer.objects.filter(shop=shop, phone=clean_phone).first()
            if existing:
                customer = existing
            else:
                customer = Customer.objects.create(
                    shop=shop,
                    created_by=actor,
                    name=new_customer_data["name"],
                    phone=clean_phone,
                    alt_phone=new_customer_data.get("alt_phone", ""),
                    email=new_customer_data.get("email", ""),
                    address=new_customer_data.get("address", ""),
                    notes=new_customer_data.get("notes", ""),
                    preferred_locale=new_customer_data.get("preferred_locale", "en"),
                    whatsapp_opt_in=new_customer_data.get("whatsapp_opt_in", True),
                    sms_opt_in=new_customer_data.get("sms_opt_in", True),
                )
        else:
            customer = Customer.objects.create(
                shop=shop,
                created_by=actor,
                name=new_customer_data["name"],
                phone=None,
                alt_phone=new_customer_data.get("alt_phone", ""),
                email=new_customer_data.get("email", ""),
                address=new_customer_data.get("address", ""),
                notes=new_customer_data.get("notes", ""),
                preferred_locale=new_customer_data.get("preferred_locale", "en"),
                whatsapp_opt_in=new_customer_data.get("whatsapp_opt_in", True),
                sms_opt_in=new_customer_data.get("sms_opt_in", True),
            )

    # 2. Device resolution
    device = data.get("device")
    if device:
        if str(device.customer_id) != str(customer.id):
            raise DomainError(
                "This device belongs to a different customer.",
                code="job.device_customer_mismatch",
                status=400,
            )
    else:
        new_device_data = data.get("new_device")
        if not new_device_data:
            raise DomainError(
                "Either device_id or new_device must be provided.",
                code="validation.failed",
                status=400,
            )
        device = create_device(
            shop=shop,
            actor=actor,
            customer=customer,
            data=new_device_data,
        )

    # 3. Allocate sequential job number
    job_no = allocate_job_no(shop)

    # 4. Lock encryption
    lock_type = data.get("lock_type", Job.LockType.NONE)
    lock_value = data.get("lock_value")
    lock_value_enc = None
    if lock_type != Job.LockType.NONE and lock_value:
        lock_value_enc = encrypt_str(lock_value)

    # 5. Create Job
    now = timezone.now()
    default_warranty = getattr(shop, "default_warranty_days", 0)
    job = Job.objects.create(
        shop=shop,
        job_no=job_no,
        kind=data.get("kind", Job.Kind.FULL),
        customer=customer,
        device=device,
        assigned_to=data.get("assigned_to"),
        status=JobStatus.RECEIVED,
        priority=data.get("priority", Job.Priority.NORMAL),
        source=data.get("source", Job.Source.WALK_IN),
        fault_description=data["fault_description"],
        device_condition=data.get("device_condition", ""),
        condition_tags=data.get("condition_tags", []),
        lock_type=lock_type,
        lock_value_enc=lock_value_enc,
        estimate_paise=data.get("estimate_paise", 0),
        expected_date=data.get("expected_date"),
        received_at=now,
        warranty_days=default_warranty,
        created_by=actor,
    )

    # 6. Accessories
    accessories = data.get("accessories", [])
    if accessories:
        JobAccessory.objects.bulk_create([JobAccessory(shop=shop, job=job, name=acc[:60]) for acc in accessories])

    # 7. First status history row
    JobStatusHistory.objects.create(
        shop=shop,
        job=job,
        from_status="",
        to_status=JobStatus.RECEIVED,
        changed_by=actor,
        changed_at=now,
    )

    # 8. Optional initial note
    internal_note = data.get("internal_note")
    if internal_note:
        JobNote.objects.create(
            shop=shop,
            job=job,
            author=actor,
            body=internal_note,
            visibility=JobNote.Visibility.INTERNAL,
            created_by=actor,
        )

    # 9. Customer touch
    customer.last_job_at = now
    customer.save(update_fields=["last_job_at"])

    # 10. Audit log
    record_audit(
        actor=actor,
        shop=shop,
        request=request,
        action="job.created",
        entity=job,
        after={
            "job_no": job.job_no,
            "customer_id": str(customer.id),
            "device_id": str(device.id),
            "status": job.status,
            "priority": job.priority,
            "estimate_paise": job.estimate_paise,
        },
    )

    # 11. Hook
    on_job_created(job)

    return job


@transaction.atomic
def update_job(*, job: Job, actor, membership, data: dict, expected_version: int | None = None, request=None) -> Job:
    """
    Updates editable fields of an existing repair job with optimistic locking and audit logging.
    """
    if expected_version is not None and job.version != expected_version:
        raise ConflictError(
            "Record version changed concurrently; reload and try again.",
            code="concurrency.version_mismatch",
        )

    if job.is_locked:
        raise ConflictError("This repair job is locked and cannot be edited.", code="job.locked")

    before_audit = {
        "fault_description": job.fault_description,
        "device_condition": job.device_condition,
        "condition_tags": list(job.condition_tags),
        "priority": job.priority,
        "estimate_paise": job.estimate_paise,
        "expected_date": str(job.expected_date) if job.expected_date else None,
        "lock_type": job.lock_type,
        "lock_value": "***" if job.lock_value_enc else None,
    }

    update_fields = ["updated_at", "version"]
    if "fault_description" in data:
        job.fault_description = data["fault_description"]
        update_fields.append("fault_description")

    if "device_condition" in data:
        job.device_condition = data["device_condition"]
        update_fields.append("device_condition")

    if "condition_tags" in data:
        job.condition_tags = data["condition_tags"]
        update_fields.append("condition_tags")

    if "priority" in data:
        job.priority = data["priority"]
        update_fields.append("priority")

    if "estimate_paise" in data:
        job.estimate_paise = data["estimate_paise"]
        update_fields.append("estimate_paise")

    if "expected_date" in data:
        job.expected_date = data["expected_date"]
        update_fields.append("expected_date")

    if "assigned_to" in data:
        job.assigned_to = data["assigned_to"]
        update_fields.append("assigned_to")

    # Lock changes
    lock_type = data.get("lock_type")
    lock_value = data.get("lock_value")
    if lock_type is not None:
        job.lock_type = lock_type
        update_fields.append("lock_type")
        if lock_type == Job.LockType.NONE:
            job.lock_value_enc = None
            update_fields.append("lock_value_enc")
        elif lock_value:
            job.lock_value_enc = encrypt_str(lock_value)
            update_fields.append("lock_value_enc")
    elif lock_value and job.lock_type != Job.LockType.NONE:
        job.lock_value_enc = encrypt_str(lock_value)
        update_fields.append("lock_value_enc")

    # Accessories update
    if "accessories" in data:
        job.accessories.all().delete()
        JobAccessory.objects.bulk_create(
            [JobAccessory(shop=job.shop, job=job, name=acc[:60]) for acc in data["accessories"]]
        )

    job.version += 1
    job.save(update_fields=list(set(update_fields)))

    after_audit = {
        "fault_description": job.fault_description,
        "device_condition": job.device_condition,
        "condition_tags": list(job.condition_tags),
        "priority": job.priority,
        "estimate_paise": job.estimate_paise,
        "expected_date": str(job.expected_date) if job.expected_date else None,
        "lock_type": job.lock_type,
        "lock_value": "***" if job.lock_value_enc else None,
    }

    record_audit(
        actor=actor,
        shop=job.shop,
        request=request,
        action="job.updated",
        entity=job,
        before=before_audit,
        after=after_audit,
    )

    return job


def reveal_lock(*, job: Job, actor, request=None) -> dict:
    """Decrypts and returns device lock credentials with an immutable audit entry."""
    raw_value = ""
    if job.lock_value_enc:
        raw_value = decrypt_str(job.lock_value_enc)

    record_audit(
        actor=actor,
        shop=job.shop,
        request=request,
        action="job.lock_viewed",
        entity=job,
        after={"lock_type": job.lock_type},
    )

    return {
        "lock_type": job.lock_type,
        "lock_value": raw_value,
    }
