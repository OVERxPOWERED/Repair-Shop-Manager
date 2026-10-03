"""
Unit tests for the GST tax engine.
TODO(verify): reviewed by CA on <date>
"""

from decimal import Decimal
from types import SimpleNamespace

from apps.billing.tax import (
    LineInput,
    compute_line,
    invoice_kind_for,
    is_intra_state,
    round_off,
)


def test_intra_state_exclusive_18_percent():
    """
    ₹1,000 exclusive intra-state with 18% GST (1800 bp).
    Taxable: 100,000 paise (₹1,000.00)
    CGST 9%: 9,000 paise (₹90.00)
    SGST 9%: 9,000 paise (₹90.00)
    Total: 118,000 paise (₹1,180.00)
    """
    line = LineInput(
        quantity=Decimal("1"),
        unit_price_paise=100000,
        discount_paise=0,
        tax_rate_bp=1800,
        tax_inclusive=False,
    )
    result = compute_line(line, intra_state=True, charge_tax=True)

    assert result.taxable_paise == 100000
    assert result.cgst_paise == 9000
    assert result.sgst_paise == 9000
    assert result.igst_paise == 0
    assert result.line_total_paise == 118000


def test_inter_state_exclusive_18_percent():
    """
    ₹1,000 exclusive inter-state with 18% GST.
    Taxable: 100,000 paise
    CGST: 0, SGST: 0, IGST 18%: 18,000 paise (₹180.00)
    Total: 118,000 paise
    """
    line = LineInput(
        quantity=Decimal("1"),
        unit_price_paise=100000,
        discount_paise=0,
        tax_rate_bp=1800,
        tax_inclusive=False,
    )
    result = compute_line(line, intra_state=False, charge_tax=True)

    assert result.taxable_paise == 100000
    assert result.cgst_paise == 0
    assert result.sgst_paise == 0
    assert result.igst_paise == 18000
    assert result.line_total_paise == 118000


def test_inclusive_18_percent():
    """
    ₹1,180 inclusive with 18% GST.
    Taxable: 100,000 paise (₹1,000.00)
    CGST: 9,000 paise
    SGST: 9,000 paise
    Total: exactly 118,000 paise (₹1,180.00)
    """
    line = LineInput(
        quantity=Decimal("1"),
        unit_price_paise=118000,
        discount_paise=0,
        tax_rate_bp=1800,
        tax_inclusive=True,
    )
    result = compute_line(line, intra_state=True, charge_tax=True)

    assert result.taxable_paise == 100000
    assert result.cgst_paise == 9000
    assert result.sgst_paise == 9000
    assert result.igst_paise == 0
    assert result.line_total_paise == 118000


def test_odd_paise_rounding_inclusive():
    """
    ₹999.00 (99900 paise) inclusive with 18% GST.
    gross = 99900
    taxable = round(99900 * 10000 / 11800) = 84661 paise
    cgst = round(84661 * 1800 / 20000) = 7620 paise
    sgst = 7620 paise
    total = 99900 paise
    taxable absorbed diff = 99900 - 7620 - 7620 = 84660 paise
    """
    line = LineInput(
        quantity=Decimal("1"),
        unit_price_paise=99900,
        discount_paise=0,
        tax_rate_bp=1800,
        tax_inclusive=True,
    )
    result = compute_line(line, intra_state=True, charge_tax=True)

    assert result.line_total_paise == 99900
    assert result.cgst_paise == 7619
    assert result.sgst_paise == 7619
    assert result.taxable_paise == 84662
    assert result.taxable_paise + result.cgst_paise + result.sgst_paise == result.line_total_paise


def test_zero_rate_or_not_charging_tax():
    """
    When charge_tax is False or tax_rate_bp is 0, zero tax components.
    """
    line = LineInput(
        quantity=Decimal("2"),
        unit_price_paise=50000,
        discount_paise=10000,
        tax_rate_bp=1800,
        tax_inclusive=False,
    )
    # Gross = 2 * 50,000 - 10,000 = 90,000 paise
    res_no_tax = compute_line(line, intra_state=True, charge_tax=False)
    assert res_no_tax.taxable_paise == 90000
    assert res_no_tax.cgst_paise == 0
    assert res_no_tax.sgst_paise == 0
    assert res_no_tax.igst_paise == 0
    assert res_no_tax.line_total_paise == 90000

    line_zero = LineInput(
        quantity=Decimal("1"),
        unit_price_paise=50000,
        discount_paise=0,
        tax_rate_bp=0,
        tax_inclusive=False,
    )
    res_zero = compute_line(line_zero, intra_state=True, charge_tax=True)
    assert res_zero.taxable_paise == 50000
    assert res_zero.cgst_paise == 0
    assert res_zero.line_total_paise == 50000


def test_round_off_helper():
    """
    Test whole rupee round-off logic: nearest half-up.
    """
    # 49 paise rounds down by 49 paise
    assert round_off(10049, enabled=True) == -49
    # 50 paise rounds up by 50 paise
    assert round_off(10050, enabled=True) == 50
    # 75 paise rounds up by 25 paise
    assert round_off(10075, enabled=True) == 25
    # Exact rupee has 0 round-off
    assert round_off(10000, enabled=True) == 0
    # Disabled returns 0 always
    assert round_off(10075, enabled=False) == 0


def test_invoice_kind_determination():
    """
    Tests invoice_kind_for based on shop settings.
    """
    unreg_shop = SimpleNamespace(gst_enabled=False, registration_type="unregistered")
    assert invoice_kind_for(unreg_shop) == "simple_bill"

    unreg_but_gst_true = SimpleNamespace(gst_enabled=True, registration_type="unregistered")
    assert invoice_kind_for(unreg_but_gst_true) == "simple_bill"

    comp_shop = SimpleNamespace(gst_enabled=True, registration_type="composition")
    assert invoice_kind_for(comp_shop) == "bill_of_supply"

    reg_shop = SimpleNamespace(gst_enabled=True, registration_type="regular")
    assert invoice_kind_for(reg_shop) == "tax_invoice"


def test_is_intra_state_logic():
    """
    Checks place of supply determination.
    """
    # Customer GSTIN matching shop state
    assert is_intra_state(shop_state_code="27", customer_gstin="27AAPFU0939F1ZV") is True
    # Customer GSTIN different state
    assert is_intra_state(shop_state_code="27", customer_gstin="07AAAAA0000A1Z5") is False
    # No customer GSTIN, place of supply state specified
    assert is_intra_state(shop_state_code="27", place_of_supply_state="27") is True
    assert is_intra_state(shop_state_code="27", place_of_supply_state="29") is False
    # No customer GSTIN, no place of supply state -> defaults to shop state
    assert is_intra_state(shop_state_code="27") is True
