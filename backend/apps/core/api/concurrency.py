"""If-Match version checks (docs/api-conventions.md 'Concurrency')."""

from django.db import transaction

from .errors import ConflictError, DomainError


def expected_version(request) -> int:
    raw = request.headers.get("If-Match")
    if raw is None:
        raise DomainError(
            "Send If-Match with the version you loaded.", code="concurrency.if_match_required", status=428
        )
    value = raw.strip()
    if value.startswith("W/"):
        value = value[2:]
    try:
        return int(value.strip('"'))
    except ValueError:
        raise DomainError(
            "If-Match must be an integer version.", code="concurrency.if_match_invalid", status=400
        ) from None


def save_with_version(request, serializer, **extra):
    """Save serializer.instance only if its stored version equals If-Match; bump version by one."""
    expected = expected_version(request)
    instance = serializer.instance
    with transaction.atomic():
        current = type(instance)._base_manager.select_for_update().only("version").get(pk=instance.pk)
        if current.version != expected:
            raise ConflictError(
                "Someone else changed this record. Reload and try again.", code="concurrency.version_mismatch"
            )
        return serializer.save(version=expected + 1, **extra)


class VersionedUpdateMixin:
    """For ModelViewSets of models that have a `version` field."""

    def perform_update(self, serializer):
        save_with_version(self.request, serializer)
