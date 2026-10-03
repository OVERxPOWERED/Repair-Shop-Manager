from decimal import Decimal

import pytest

from apps.core.money import mul_qty, paise_to_rupees_str, round_half_up_div


def test_round_half_up_div():
    assert round_half_up_div(5, 2) == 3
    assert round_half_up_div(-5, 2) == -3
    assert round_half_up_div(4, 2) == 2
    assert round_half_up_div(-4, 2) == -2
    assert round_half_up_div(1, 3) == 0
    assert round_half_up_div(2, 3) == 1
    assert round_half_up_div(-2, 3) == -1
    assert round_half_up_div(0, 5) == 0

    with pytest.raises(ValueError, match="denominator must be positive"):
        round_half_up_div(5, 0)

    with pytest.raises(ValueError, match="denominator must be positive"):
        round_half_up_div(5, -2)


def test_mul_qty():
    # 100 paise x 1.5 -> 150 paise
    assert mul_qty(100, Decimal("1.5")) == 150
    # 100 paise x 1.005 -> 100.5 -> 101 paise (round half up)
    assert mul_qty(100, Decimal("1.005")) == 101
    # 100 paise x 1.004 -> 100.4 -> 100 paise
    assert mul_qty(100, Decimal("1.004")) == 100
    # 0 quantity or 0 unit price
    assert mul_qty(0, Decimal("5")) == 0
    assert mul_qty(500, Decimal("0")) == 0
    # Negative unit cost/price or quantity
    assert mul_qty(-100, Decimal("1.5")) == -150


def test_paise_to_rupees_str():
    assert paise_to_rupees_str(129950) == "1299.50"
    assert paise_to_rupees_str(0) == "0.00"
    assert paise_to_rupees_str(5) == "0.05"
    assert paise_to_rupees_str(50) == "0.50"
    assert paise_to_rupees_str(100) == "1.00"
    assert paise_to_rupees_str(-129950) == "-1299.50"
    assert paise_to_rupees_str(-5) == "-0.05"
