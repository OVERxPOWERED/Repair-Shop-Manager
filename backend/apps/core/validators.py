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


GSTIN_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
GSTIN_RE = re.compile(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$")
UPI_ID_RE = re.compile(r"^[A-Za-z0-9.\-_]{2,256}@[A-Za-z][A-Za-z0-9.\-]{1,63}$")

# GST state codes. TODO(verify) against the current GST portal list before Phase 1 invoicing.
GST_STATE_CODES = {
    "01": "Jammu and Kashmir",
    "02": "Himachal Pradesh",
    "03": "Punjab",
    "04": "Chandigarh",
    "05": "Uttarakhand",
    "06": "Haryana",
    "07": "Delhi",
    "08": "Rajasthan",
    "09": "Uttar Pradesh",
    "10": "Bihar",
    "11": "Sikkim",
    "12": "Arunachal Pradesh",
    "13": "Nagaland",
    "14": "Manipur",
    "15": "Mizoram",
    "16": "Tripura",
    "17": "Meghalaya",
    "18": "Assam",
    "19": "West Bengal",
    "20": "Jharkhand",
    "21": "Odisha",
    "22": "Chhattisgarh",
    "23": "Madhya Pradesh",
    "24": "Gujarat",
    "26": "Dadra and Nagar Haveli and Daman and Diu",
    "27": "Maharashtra",
    "29": "Karnataka",
    "30": "Goa",
    "31": "Lakshadweep",
    "32": "Kerala",
    "33": "Tamil Nadu",
    "34": "Puducherry",
    "35": "Andaman and Nicobar Islands",
    "36": "Telangana",
    "37": "Andhra Pradesh",
    "38": "Ladakh",
    "97": "Other Territory",
}


def gstin_check_char(first14: str) -> str:
    total = 0
    for i, ch in enumerate(first14):
        product = GSTIN_CHARS.index(ch) * (1 if i % 2 == 0 else 2)
        total += product // 36 + product % 36
    return GSTIN_CHARS[(36 - total % 36) % 36]


def validate_gstin(value: str) -> str:
    """Returns the upper-cased GSTIN or raises ValidationError."""
    gstin = (value or "").strip().upper()
    if not GSTIN_RE.match(gstin):
        raise ValidationError(_("GSTIN must be 15 characters, like 27AAPFU0939F1ZV."), code="gstin_format")
    if gstin[:2] not in GST_STATE_CODES:
        raise ValidationError(_("GSTIN starts with an unknown state code."), code="gstin_state")
    if gstin_check_char(gstin[:14]) != gstin[14]:
        raise ValidationError(_("GSTIN check character is wrong. Please re-check the number."), code="gstin_checksum")
    return gstin


def validate_state_code(value: str) -> None:
    if value and value not in GST_STATE_CODES:
        raise ValidationError(_("Unknown state code."), code="state_code")


def validate_upi_id(value: str) -> None:
    if value and not UPI_ID_RE.match(value):
        raise ValidationError(_("UPI ID looks wrong. Example: shopname@okaxis"), code="upi_id")
