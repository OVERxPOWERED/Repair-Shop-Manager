import json

from django.core.serializers.json import DjangoJSONEncoder

from apps.audit.models import AuditLog
from apps.core.net import get_client_ip


def snapshot(obj, fields) -> dict:
    """JSON-safe dict of selected fields (UUIDs, dates and Decimals become strings)."""
    raw = {f: getattr(obj, f) for f in fields if hasattr(obj, f)}
    return json.loads(json.dumps(raw, cls=DjangoJSONEncoder))


def _diff(before: dict | None, after: dict | None) -> tuple[dict | None, dict | None]:
    if before is None or after is None:
        return before, after
    changed = {k for k in set(before) | set(after) if before.get(k) != after.get(k)}
    return {k: before.get(k) for k in changed}, {k: after.get(k) for k in changed}


def record_audit(
    *,
    action: str,
    entity=None,
    entity_type: str = "",
    entity_id: str = "",
    request=None,
    actor=None,
    shop=None,
    before: dict | None = None,
    after: dict | None = None,
) -> AuditLog:
    if entity is not None:
        entity_type = entity_type or f"{entity._meta.app_label}.{entity._meta.model_name}"
        entity_id = entity_id or str(entity.pk)
    meta = {}
    if request is not None:
        user = getattr(request, "user", None)
        actor = actor or (user if user is not None and user.is_authenticated else None)
        shop = shop or getattr(request, "shop", None)
        meta = {
            "ip": get_client_ip(request),
            "user_agent": request.META.get("HTTP_USER_AGENT", "")[:255],
            "request_id": getattr(request, "request_id", "") or "",
        }
    before, after = _diff(before, after)
    return AuditLog.objects.create(
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        actor=actor,
        shop=shop,
        before=before,
        after=after,
        **meta,
    )
