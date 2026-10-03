from apps.jobs.models import JobStatus as S

TRANSITIONS: dict[str, set[str]] = {
    S.RECEIVED: {S.DIAGNOSING, S.AWAITING_APPROVAL, S.IN_REPAIR, S.CANCELLED},
    S.DIAGNOSING: {S.AWAITING_APPROVAL, S.AWAITING_PARTS, S.IN_REPAIR, S.RETURNED_UNREPAIRED, S.CANCELLED},
    S.AWAITING_APPROVAL: {S.IN_REPAIR, S.AWAITING_PARTS, S.RETURNED_UNREPAIRED, S.CANCELLED},
    S.AWAITING_PARTS: {S.IN_REPAIR, S.CANCELLED},
    S.IN_REPAIR: {S.REPAIRED, S.AWAITING_PARTS, S.RETURNED_UNREPAIRED},
    S.REPAIRED: {S.READY_FOR_PICKUP, S.IN_REPAIR},
    S.READY_FOR_PICKUP: {S.DELIVERED, S.IN_REPAIR},
    S.DELIVERED: set(),  # reopen only via /reopen/
    S.CANCELLED: set(),
    S.RETURNED_UNREPAIRED: set(),
}
TERMINAL = {S.DELIVERED, S.CANCELLED, S.RETURNED_UNREPAIRED}

# Dashboard / filter groups (used by API and UI)
GROUPS = {
    "pending": {S.RECEIVED},
    "in_progress": {S.DIAGNOSING, S.AWAITING_APPROVAL, S.AWAITING_PARTS, S.IN_REPAIR},
    "repaired": {S.REPAIRED, S.READY_FOR_PICKUP},
    "delivered": {S.DELIVERED},
    "closed": {S.CANCELLED, S.RETURNED_UNREPAIRED},
}


def required_permission(to_status: str) -> str:
    return "jobs.deliver" if to_status == S.DELIVERED else "jobs.change_status"


def allowed_next(job, membership) -> list[str]:
    return [s for s in sorted(TRANSITIONS.get(job.status, set())) if membership.has_perm(required_permission(s))]
