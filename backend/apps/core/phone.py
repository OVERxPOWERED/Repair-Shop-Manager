import re

E164 = re.compile(r"^\+[1-9]\d{7,14}$")


def normalize_phone(value: str) -> str:
    """'98765 43210' -> '+919876543210'. Raises ValueError for anything that is not E.164 afterwards."""
    cleaned = re.sub(r"[\s\-()]", "", value or "")
    if cleaned.startswith("00"):
        cleaned = "+" + cleaned[2:]
    if not cleaned.startswith("+"):
        if len(cleaned) == 11 and cleaned.startswith("0"):
            cleaned = cleaned[1:]
        cleaned = f"+91{cleaned}" if len(cleaned) == 10 else f"+{cleaned}"
    if not E164.match(cleaned):
        raise ValueError("Enter a valid phone number, for example +919876543210.")
    return cleaned


def mask_phone(phone: str | None) -> str:
    """'+919876543210' -> '+91XXXXXX3210' (docs/api-conventions.md)."""
    if not phone:
        return ""
    if len(phone) <= 7:
        return "X" * len(phone)
    return phone[:3] + "X" * (len(phone) - 7) + phone[-4:]
