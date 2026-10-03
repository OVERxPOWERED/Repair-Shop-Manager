"""
Unit tests for the amount_in_words helper (Python port).
"""

from apps.core.amount_words import amount_in_words, integer_to_indian_words


def test_integer_to_indian_words():
    assert integer_to_indian_words(0) == "Zero"
    assert integer_to_indian_words(1) == "One"
    assert integer_to_indian_words(15) == "Fifteen"
    assert integer_to_indian_words(20) == "Twenty"
    assert integer_to_indian_words(42) == "Forty Two"
    assert integer_to_indian_words(99) == "Ninety Nine"
    assert integer_to_indian_words(100) == "One Hundred"
    assert integer_to_indian_words(105) == "One Hundred Five"
    assert integer_to_indian_words(350) == "Three Hundred Fifty"
    assert integer_to_indian_words(1000) == "One Thousand"
    assert integer_to_indian_words(1299) == "One Thousand Two Hundred Ninety Nine"
    assert integer_to_indian_words(15000) == "Fifteen Thousand"
    assert integer_to_indian_words(99999) == "Ninety Nine Thousand Nine Hundred Ninety Nine"
    assert integer_to_indian_words(100000) == "One Lakh"
    assert integer_to_indian_words(2500000) == "Twenty Five Lakh"
    assert integer_to_indian_words(10000000) == "One Crore"
    assert integer_to_indian_words(10500050) == "One Crore Five Lakh Fifty"
    assert (
        integer_to_indian_words(12345678) == "One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight"
    )


def test_amount_in_words():
    assert amount_in_words(0) == "Zero Rupees Only"
    assert amount_in_words(129950) == "Rupees One Thousand Two Hundred Ninety Nine and Fifty Paise Only"
    assert amount_in_words(100000) == "Rupees One Thousand Only"
    assert amount_in_words(100) == "Rupee One Only"
    assert amount_in_words(50000) == "Rupees Five Hundred Only"
    assert amount_in_words(350000) == "Rupees Three Thousand Five Hundred Only"
    assert amount_in_words(1) == "One Paisa Only"
    assert amount_in_words(50) == "Fifty Paise Only"
    assert amount_in_words(101) == "Rupee One and One Paisa Only"
    assert amount_in_words(50025) == "Rupees Five Hundred and Twenty Five Paise Only"
    assert amount_in_words(-150000) == "Minus Rupees One Thousand Five Hundred Only"
