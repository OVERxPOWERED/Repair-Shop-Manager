from urllib.parse import quote

from apps.core.money import paise_to_rupees_str


def build_upi_uri(*, vpa: str, payee_name: str, amount_paise: int, note: str) -> str:
    """upi://pay deep link (NPCI linking spec; TODO(verify) parameters with a real UPI app scan)."""
    params = {
        "pa": vpa,
        "pn": payee_name[:50],
        "am": paise_to_rupees_str(amount_paise),
        "cu": "INR",
        "tn": note[:50],
    }
    return "upi://pay?" + "&".join(f"{k}={quote(v, safe='')}" for k, v in params.items())
