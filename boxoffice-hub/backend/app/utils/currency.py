import re

CRORE = 10_000_000.0
LAKH = 100_000.0


def _indian_comma_format(value: int) -> str:
    """Format an integer with the Indian numbering system (e.g., 1,25,000)."""
    negative = value < 0
    s = str(abs(value))
    if len(s) <= 3:
        formatted = s
    else:
        last_three = s[-3:]
        rest = s[:-3]
        parts = []
        while len(rest) > 2:
            parts.append(rest[-2:])
            rest = rest[:-2]
        if rest:
            parts.append(rest)
        formatted = ",".join(reversed(parts)) + "," + last_three
    return f"-{formatted}" if negative else formatted


def _format_decimal_indian(number: float, decimals: int = 2) -> str:
    negative = number < 0
    abs_val = abs(number)
    whole = int(abs_val)
    frac = f"{abs_val:.{decimals}f}".split(".")[1] if decimals > 0 else ""
    whole_str = _indian_comma_format(whole)
    result = f"{whole_str}.{frac}" if decimals > 0 else whole_str
    return f"-{result}" if negative else result


def format_inr(amount: float) -> str:
    """
    Format numeric INR into Indian shorthand:
    - >= 1 Cr -> '₹1,124.14 Cr'
    - >= 1 L  -> '₹86.98 L'
    - < 1 L   -> '₹64,000'
    """
    if amount is None:
        return "₹0"
    abs_amount = abs(float(amount))
    sign = "-" if amount < 0 else ""
    if abs_amount >= CRORE:
        cr_val = abs_amount / CRORE
        return f"{sign}₹{_format_decimal_indian(cr_val, 2)} Cr"
    if abs_amount >= LAKH:
        lakh_val = abs_amount / LAKH
        return f"{sign}₹{_format_decimal_indian(lakh_val, 2)} L"
    return f"{sign}₹{_indian_comma_format(round(abs_amount))}"


def parse_inr(text: str) -> float:
    """
    Parse Indian currency strings like '₹1,124.14 Cr', '₹86.98 L', '₹64,000' into exact INR float.
    """
    if not text or not isinstance(text, str):
        return 0.0
    cleaned = text.strip().replace(",", "").replace("₹", "").replace("INR", "").strip()
    match = re.search(r"(-?\d+(?:\.\d+)?)\s*(cr|crore|crores|l|lac|lakh|lakhs|k|thousand)?", cleaned, re.I)
    if not match:
        return 0.0
    num = float(match.group(1))
    unit = (match.group(2) or "").lower()
    if unit in ("cr", "crore", "crores"):
        return round(num * CRORE, 2)
    if unit in ("l", "lac", "lakh", "lakhs"):
        return round(num * LAKH, 2)
    if unit in ("k", "thousand"):
        return round(num * 1_000.0, 2)
    return round(num, 2)
