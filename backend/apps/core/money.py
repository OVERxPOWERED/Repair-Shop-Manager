from decimal import ROUND_HALF_UP, Decimal


def round_half_up_div(numerator: int, denominator: int) -> int:
    """Integer division rounded half away from zero. round_half_up_div(5, 2) == 3; (-5, 2) == -3."""
    if denominator <= 0:
        raise ValueError("denominator must be positive")
    q, r = divmod(abs(numerator), denominator)
    if r * 2 >= denominator:
        q += 1
    return q if numerator >= 0 else -q


def mul_qty(unit_paise: int, quantity: Decimal) -> int:
    """unit price (paise) x quantity (up to 3 decimals) -> paise, rounded half up."""
    return int((Decimal(unit_paise) * quantity).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def paise_to_rupees_str(paise: int) -> str:
    """129950 -> '1299.50' (for UPI links and PDFs; never for maths)."""
    sign = "-" if paise < 0 else ""
    p = abs(paise)
    return f"{sign}{p // 100}.{p % 100:02d}"
