from datetime import date, datetime
from zoneinfo import ZoneInfo

from django.utils import timezone

IST = ZoneInfo("Asia/Kolkata")


def now_ist() -> datetime:
    return timezone.now().astimezone(IST)


def today_ist() -> date:
    return now_ist().date()


def financial_year_start(d: date) -> int:
    """Indian financial year runs April to March. 2027-03-31 -> 2026, 2027-04-01 -> 2027."""
    return d.year if d.month >= 4 else d.year - 1


def financial_year_label(fy_start: int) -> str:
    """2026 -> '26-27'."""
    return f"{fy_start % 100:02d}-{(fy_start + 1) % 100:02d}"
