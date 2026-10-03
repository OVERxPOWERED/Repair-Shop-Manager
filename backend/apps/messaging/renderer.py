"""
Safe template renderer for customer messaging.
Uses string.Formatter with a strict whitelist of placeholder names.
Never executes arbitrary string formatting or attributes.
"""

import logging
import string

logger = logging.getLogger("fixpro.messaging")

ALLOWED_PLACEHOLDERS = frozenset(
    {
        "shop_name",
        "job_no",
        "device",
        "status",
        "amount",
        "link",
        "customer_name",
        "otp",
    }
)


def render_template(template_body: str, context: dict) -> str:
    """
    Renders template_body safely using a strict whitelist of placeholder names.
    Unknown placeholders and attribute/index lookups evaluate to an empty string.
    Never uses str.format on user-controlled templates.
    """
    if not template_body:
        return ""

    formatter = string.Formatter()
    rendered_parts: list[str] = []

    try:
        for literal_text, field_name, _format_spec, _conversion in formatter.parse(template_body):
            rendered_parts.append(literal_text)
            if field_name is not None:
                # Strip any malicious attribute or index access e.g. {obj.__class__} or {dict[key]}
                clean_name = field_name.split(".")[0].split("[")[0].strip()
                if clean_name in ALLOWED_PLACEHOLDERS:
                    val = context.get(clean_name, "")
                    rendered_parts.append(str(val) if val is not None else "")
                else:
                    rendered_parts.append("")
    except ValueError as exc:
        logger.warning("Malformed message template format string: %s (%s)", template_body, exc)
        return template_body

    return "".join(rendered_parts)
