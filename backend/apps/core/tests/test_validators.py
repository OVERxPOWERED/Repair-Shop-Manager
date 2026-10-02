"""
Tests for core validators including Luhn IMEI algorithm.
"""

import pytest
from django.core.exceptions import ValidationError

from apps.core.validators import validate_imei_luhn


def test_valid_imei_luhn_passes():
    # Valid test IMEIs with mathematically verified 15th Luhn digit
    valid_imeis = [
        "864501041234560",
        "352099001761481",
        "990000862471853",
        "864501-04-123456-0",  # with dashes
        "864501 04 123456 0",  # with spaces
    ]
    for imei in valid_imeis:
        validate_imei_luhn(imei)  # Should not raise


def test_invalid_imei_check_digit_raises():
    # Tampered 15th digit: correct is 0, provided is 7
    with pytest.raises(ValidationError) as exc:
        validate_imei_luhn("864501041234567")
    assert "check digit" in str(exc.value)


def test_invalid_imei_length_raises():
    with pytest.raises(ValidationError) as exc:
        validate_imei_luhn("1234567890")
    assert "15 numeric digits" in str(exc.value)
