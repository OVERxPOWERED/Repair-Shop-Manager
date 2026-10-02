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


def test_gstin_validation():
    from apps.core.validators import validate_gstin

    # Valid GSTINs
    assert validate_gstin("27AAPFU0939F1ZV") == "27AAPFU0939F1ZV"
    assert validate_gstin("29ABCDE1234F1ZW") == "29ABCDE1234F1ZW"
    assert validate_gstin(" 27aapfu0939f1zv ") == "27AAPFU0939F1ZV"

    # Bad format
    with pytest.raises(ValidationError) as exc:
        validate_gstin("SHORT")
    assert "15 characters" in str(exc.value)

    # Unknown state
    with pytest.raises(ValidationError) as exc:
        validate_gstin("99AAPFU0939F1ZV")
    assert "state code" in str(exc.value)

    # Bad checksum
    with pytest.raises(ValidationError) as exc:
        validate_gstin("29ABCDE1234F1Z5")
    assert "check character is wrong" in str(exc.value)


def test_state_code_validation():
    from apps.core.validators import validate_state_code

    validate_state_code("27")  # Valid (Maharashtra)
    validate_state_code("29")  # Valid (Karnataka)
    validate_state_code("")  # Blank is ok

    with pytest.raises(ValidationError) as exc:
        validate_state_code("99")
    assert "Unknown state code" in str(exc.value)


def test_upi_id_validation():
    from apps.core.validators import validate_upi_id

    validate_upi_id("fixpro@okaxis")
    validate_upi_id("shop.name-123@icici")
    validate_upi_id("")  # Blank is ok

    with pytest.raises(ValidationError) as exc:
        validate_upi_id("invalid-upi-without-at")
    assert "UPI ID looks wrong" in str(exc.value)
