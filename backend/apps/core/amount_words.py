"""
Utility functions to convert amounts in paise to Indian English words.
"""

ONES = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
]

TENS = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
]


def two_digits_to_words(n: int) -> str:
    if n < 20:
        return ONES[n]
    tens = n // 10
    ones = n % 10
    return TENS[tens] if ones == 0 else f"{TENS[tens]} {ONES[ones]}"


def three_digits_to_words(n: int) -> str:
    hundreds = n // 100
    remainder = n % 100
    parts = []
    if hundreds > 0:
        parts.append(f"{ONES[hundreds]} Hundred")
    if remainder > 0:
        parts.append(two_digits_to_words(remainder))
    return " ".join(parts)


def integer_to_indian_words(n: int) -> str:
    """
    Converts a non-negative integer into words following the Indian numbering system:
    Crores (1,00,00,000), Lakhs (1,00,000), Thousands (1,000), Hundreds (100).
    """
    if n == 0:
        return "Zero"

    parts = []
    crores = n // 10000000
    remainder = n % 10000000

    if crores > 0:
        parts.append(f"{integer_to_indian_words(crores)} Crore")

    lakhs = remainder // 100000
    remainder = remainder % 100000

    if lakhs > 0:
        parts.append(f"{two_digits_to_words(lakhs)} Lakh")

    thousands = remainder // 1000
    remainder = remainder % 1000

    if thousands > 0:
        parts.append(f"{two_digits_to_words(thousands)} Thousand")

    if remainder > 0:
        parts.append(three_digits_to_words(remainder))

    return " ".join(parts)


def amount_in_words(paise: int) -> str:
    """
    Converts integer paise into Indian English financial words.

    Example:
    129950 -> "Rupees One Thousand Two Hundred Ninety Nine and Fifty Paise Only"
    129900 -> "Rupees One Thousand Two Hundred Ninety Nine Only"
    50     -> "Fifty Paise Only"
    0      -> "Zero Rupees Only"
    """
    if paise == 0:
        return "Zero Rupees Only"

    is_negative = paise < 0
    absolute_paise = abs(paise)
    rupees = absolute_paise // 100
    rem_paise = absolute_paise % 100

    parts = []

    if rupees > 0:
        rupee_label = "Rupee" if rupees == 1 else "Rupees"
        parts.append(f"{rupee_label} {integer_to_indian_words(rupees)}")

    if rem_paise > 0:
        paise_words = two_digits_to_words(rem_paise)
        paise_label = "Paisa" if rem_paise == 1 else "Paise"
        if rupees > 0:
            parts.append(f"and {paise_words} {paise_label}")
        else:
            parts.append(f"{paise_words} {paise_label}")

    parts.append("Only")

    result = " ".join(parts)
    return f"Minus {result}" if is_negative else result
