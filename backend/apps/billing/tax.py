"""
Pure functions for GST calculations, invoice kind selection, and totals rounding.
TODO(verify): reviewed by CA on <date>
"""

from dataclasses import dataclass
from decimal import Decimal

from apps.core.money import mul_qty, round_half_up_div


@dataclass(frozen=True)
class LineInput:
    quantity: Decimal
    unit_price_paise: int
    discount_paise: int
    tax_rate_bp: int  # Basis points: 0, 500, 1200, 1800, 2800 ...
    tax_inclusive: bool = False


@dataclass(frozen=True)
class LineTax:
    taxable_paise: int
    cgst_paise: int
    sgst_paise: int
    igst_paise: int
    line_total_paise: int


def compute_line(line: LineInput, *, intra_state: bool, charge_tax: bool) -> LineTax:
    """
    Computes taxable amount and tax components for a single line item.
    - If not charging tax (e.g. non-GST shop, composition scheme, or rate 0), tax components are 0.
    - If tax inclusive, taxable is extracted from gross; any fractional rounding diff is absorbed into taxable.
    - If intra-state, CGST and SGST are computed separately (taxable * rate / 20000).
    - If inter-state, IGST is computed (taxable * rate / 10000).
    TODO(verify) rounding method with the CA.
    """
    gross = mul_qty(line.unit_price_paise, line.quantity) - line.discount_paise
    if not charge_tax or line.tax_rate_bp == 0:
        return LineTax(
            taxable_paise=gross,
            cgst_paise=0,
            sgst_paise=0,
            igst_paise=0,
            line_total_paise=gross,
        )

    taxable = round_half_up_div(gross * 10000, 10000 + line.tax_rate_bp) if line.tax_inclusive else gross

    if intra_state:
        # Each half rounded separately. TODO(verify) rounding method with the CA.
        cgst = round_half_up_div(taxable * line.tax_rate_bp, 20000)
        sgst = cgst
        igst = 0
    else:
        cgst = 0
        sgst = 0
        igst = round_half_up_div(taxable * line.tax_rate_bp, 10000)

    total = gross if line.tax_inclusive else taxable + cgst + sgst + igst
    if line.tax_inclusive:
        # Keep customer price exact: put any rounding difference into taxable.
        taxable = total - cgst - sgst - igst

    return LineTax(
        taxable_paise=taxable,
        cgst_paise=cgst,
        sgst_paise=sgst,
        igst_paise=igst,
        line_total_paise=total,
    )


def round_off(total_paise: int, enabled: bool) -> int:
    """
    Amount in paise to add to total_paise so the final total is a whole rupee (nearest, half up).
    Positive when rounding up, negative when rounding down.
    TODO(verify) with the CA.
    """
    if not enabled:
        return 0
    return round_half_up_div(total_paise, 100) * 100 - total_paise


def invoice_kind_for(shop) -> str:
    """
    Determines the invoice kind based on shop registration and GST toggle.
    - unregistered / gst_enabled False -> simple_bill
    - composition -> bill_of_supply (no tax charged)
    - regular GST -> tax_invoice
    TODO(verify) wording requirements for bill_of_supply with the CA.
    """
    if not getattr(shop, "gst_enabled", False) or getattr(shop, "registration_type", "unregistered") == "unregistered":
        return "simple_bill"
    if getattr(shop, "registration_type", "") == "composition":
        return "bill_of_supply"
    return "tax_invoice"


def is_intra_state(*, shop_state_code: str, customer_gstin: str = "", place_of_supply_state: str = "") -> bool:
    """
    Determines if supply is intra-state.
    Place of supply: customer_gstin[:2] if given, else place_of_supply_state, else shop_state_code.
    TODO(verify) with the CA.
    """
    pos = ""
    if customer_gstin and len(customer_gstin) >= 2:
        pos = customer_gstin[:2]
    elif place_of_supply_state:
        pos = place_of_supply_state
    else:
        pos = shop_state_code
    return bool(pos and shop_state_code and pos == shop_state_code)
