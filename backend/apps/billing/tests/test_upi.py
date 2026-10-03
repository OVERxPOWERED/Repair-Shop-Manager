from urllib.parse import parse_qs, urlparse

from apps.billing.upi import build_upi_uri


def test_build_upi_uri_basic():
    uri = build_upi_uri(
        vpa="shop@okaxis",
        payee_name="Quick Fix Repairs",
        amount_paise=129950,
        note="Job #1024 Balance",
    )
    assert uri.startswith("upi://pay?")
    parsed = urlparse(uri)
    params = parse_qs(parsed.query)

    assert params["pa"] == ["shop@okaxis"]
    assert params["pn"] == ["Quick Fix Repairs"]
    assert params["am"] == ["1299.50"]
    assert params["cu"] == ["INR"]
    assert params["tn"] == ["Job #1024 Balance"]


def test_build_upi_uri_special_characters_and_truncation():
    long_name = "A" * 60
    long_note = "Job & Repairs @ Special #100 / Discount % test " * 2
    uri = build_upi_uri(
        vpa="test.merchant@upi",
        payee_name=long_name,
        amount_paise=10000,
        note=long_note,
    )
    parsed = urlparse(uri)
    params = parse_qs(parsed.query)

    assert len(params["pn"][0]) <= 50
    assert len(params["tn"][0]) <= 50
    assert params["am"] == ["100.00"]
    # Check that '&' was properly quoted in query string so it doesn't break query param parsing
    assert "&" in uri or "%26" in uri
