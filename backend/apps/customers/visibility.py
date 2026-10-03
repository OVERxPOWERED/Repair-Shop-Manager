from apps.core.phone import mask_phone


def can_see_customer_phone(membership) -> bool:
    """Masking applies only when the shop turned it on AND the role lacks customers.see_phone."""
    if membership is None:
        return True
    return membership.has_perm("customers.see_phone") or not getattr(membership.shop, "mask_phone_for_engineers", False)


def present_phone(phone: str | None, membership) -> str | None:
    if not phone:
        return phone
    return phone if can_see_customer_phone(membership) else mask_phone(phone)
