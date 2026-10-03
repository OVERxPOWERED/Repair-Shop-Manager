import uuid

from django.db import transaction
from django.db.models import Q, Sum
from django.utils import timezone

from apps.audit.services import record_audit, snapshot
from apps.billing.models import Payment
from apps.core.api.errors import DomainError
from apps.jobs.models import Job


def job_paid_paise(job: Job) -> int:
    """Calculates net paid paise for a job: IN minus OUT (refunds)."""
    agg = Payment.objects.filter(job=job, deleted_at__isnull=True).aggregate(
        inn=Sum("amount_paise", filter=Q(direction=Payment.Direction.IN)),
        out=Sum("amount_paise", filter=Q(direction=Payment.Direction.OUT)),
    )
    return (agg["inn"] or 0) - (agg["out"] or 0)


def job_balance_paise(job: Job) -> int:
    """What the customer still owes. Before any line items exist, the estimate is the reference."""
    billable = job.total_paise if job.total_paise > 0 else job.estimate_paise
    return billable - job_paid_paise(job)


def record_payment(
    *,
    shop,
    actor,
    job: Job,
    mode: str,
    amount_paise: int,
    reference: str = "",
    idempotency_key,
    notes: str = "",
    request=None,
) -> Payment:
    """
    Records an incoming payment against a job.
    Runs inside a transaction with select_for_update on the job.
    """
    if isinstance(idempotency_key, str):
        idempotency_key = uuid.UUID(idempotency_key)

    with transaction.atomic():
        locked_job = Job.objects.select_for_update().get(id=job.id, shop=shop)

        # Idempotency safety check
        existing = Payment.objects.filter(shop=shop, idempotency_key=idempotency_key).first()
        if existing:
            return existing

        balance = job_balance_paise(locked_job)
        if amount_paise > balance:
            raise DomainError(
                "Payment amount exceeds outstanding balance.",
                code="payment.exceeds_balance",
                fields={"amount_paise": ["Payment amount exceeds outstanding balance."]},
            )

        payment = Payment.objects.create(
            shop=shop,
            job=locked_job,
            customer=locked_job.customer,
            direction=Payment.Direction.IN,
            mode=mode,
            amount_paise=amount_paise,
            reference=reference or "",
            received_by=actor,
            received_at=timezone.now(),
            idempotency_key=idempotency_key,
            notes=notes or "",
        )

        record_audit(
            action="payment.recorded",
            entity=payment,
            actor=actor,
            shop=shop,
            request=request,
            after=snapshot(payment, ("amount_paise", "mode", "direction", "reference")),
        )
        return payment


def refund_payment(
    *,
    payment: Payment,
    actor,
    amount_paise: int,
    reason: str,
    idempotency_key,
    request=None,
) -> Payment:
    """
    Issues a partial or full refund for a previous payment.
    """
    if isinstance(idempotency_key, str):
        idempotency_key = uuid.UUID(idempotency_key)

    with transaction.atomic():
        existing = Payment.objects.filter(shop=payment.shop, idempotency_key=idempotency_key).first()
        if existing:
            return existing

        if payment.direction != Payment.Direction.IN:
            raise DomainError(
                "Cannot refund a refund payment.",
                code="payment.cannot_refund_refund",
            )

        locked_payment = Payment.objects.select_for_update().get(id=payment.id)

        already_refunded = (
            Payment.objects.filter(
                refunds_payment=locked_payment,
                direction=Payment.Direction.OUT,
                deleted_at__isnull=True,
            ).aggregate(s=Sum("amount_paise"))["s"]
            or 0
        )

        refundable = locked_payment.amount_paise - already_refunded
        if amount_paise > refundable:
            raise DomainError(
                "Refund amount exceeds remaining refundable amount.",
                code="payment.refund_exceeds_paid",
                fields={"amount_paise": ["Refund amount exceeds remaining refundable amount."]},
            )

        refund = Payment.objects.create(
            shop=locked_payment.shop,
            job=locked_payment.job,
            customer=locked_payment.customer,
            direction=Payment.Direction.OUT,
            mode=locked_payment.mode,
            amount_paise=amount_paise,
            reference=locked_payment.reference,
            received_by=actor,
            received_at=timezone.now(),
            refunds_payment=locked_payment,
            idempotency_key=idempotency_key,
            notes=reason or "",
        )

        record_audit(
            action="payment.refunded",
            entity=refund,
            actor=actor,
            shop=locked_payment.shop,
            request=request,
            after=snapshot(refund, ("amount_paise", "mode", "direction", "notes")),
        )
        return refund


def record_advance(
    *,
    shop,
    actor,
    job: Job,
    amount_paise: int,
    mode: str,
    idempotency_key=None,
    reference: str = "",
    request=None,
) -> Payment | None:
    """Helper used during job creation when advance_paise > 0."""
    if amount_paise <= 0:
        return None
    if idempotency_key is None:
        idempotency_key = uuid.uuid4()
    return record_payment(
        shop=shop,
        actor=actor,
        job=job,
        mode=mode,
        amount_paise=amount_paise,
        reference=reference,
        idempotency_key=idempotency_key,
        notes="Advance payment at intake",
        request=request,
    )
