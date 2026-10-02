"""
Core validation utilities for FixPro.
Includes Luhn algorithm check-digit validator for 15-digit IMEI strings.
"""

import re

from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _

IMEI_REGEX = re.compile(r"^\d{15}$")


def validate_imei_luhn(value: str) -> None:
    """
    Validates that a 15-digit IMEI has a valid Luhn check digit.
    Raises ValidationError if invalid.
    """
    if not value:
        return

    cleaned = str(value).strip().replace(" ", "").replace("-", "")
    if not IMEI_REGEX.match(cleaned):
        raise ValidationError(_("IMEI must be exactly 15 numeric digits."), code="invalid_imei_format")

    digits = [int(c) for c in cleaned]
    total_sum = 0
    for i in range(15):
        digit = digits[i]
        # Double every second digit (1-indexed: 2nd, 4th, 6th... -> 0-indexed: 1, 3, 5...)
        if i % 2 == 1:
            digit *= 2
            if digit > 9:
                digit = (digit // 10) + (digit % 10)
        total_sum += digit

    if total_sum % 10 != 0:
        raise ValidationError(
            _("Invalid IMEI check digit (failed Luhn algorithm verification)."), code="invalid_imei_check_digit"
        )
