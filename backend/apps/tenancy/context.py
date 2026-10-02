import uuid

from apps.core.api.errors import DomainError, NotFoundError
from apps.tenancy.models import Membership, Organization


def resolve_shop_context(request) -> Membership:
    """Reads X-Shop-Id, loads the caller's ACTIVE membership, sets request.shop / request.membership.
    A shop the caller does not belong to is reported exactly like a missing shop (404)."""
    existing = getattr(request, "membership", None)
    if existing is not None:
        return existing
    raw = request.headers.get("X-Shop-Id")
    if not raw:
        raise DomainError("Header 'X-Shop-Id' is required.", code="shop.header_missing", status=400)
    try:
        shop_id = uuid.UUID(raw.strip())
    except ValueError:
        raise DomainError("Header 'X-Shop-Id' must be a UUID.", code="shop.header_invalid", status=400) from None
    membership = (
        Membership.objects.select_related("shop", "shop__organization", "role")
        .filter(
            user=request.user,
            shop_id=shop_id,
            status=Membership.StatusChoices.ACTIVE,
            shop__deleted_at__isnull=True,
            shop__organization__status=Organization.StatusChoices.ACTIVE,
        )
        .first()
    )
    if membership is None:
        raise NotFoundError("Shop not found.", code="shop.not_found")
    request.shop = membership.shop
    request.membership = membership
    return membership
