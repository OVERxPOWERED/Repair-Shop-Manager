import re

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction

from apps.core.api.errors import DomainError
from apps.core.validators import validate_imei_luhn
from apps.devices.models import Device, DeviceIdentifier


def clean_identifier(type_: str, value: str, confirm_invalid: bool = False) -> tuple[str, bool | None]:
    """Returns (normalised value, luhn_valid). IMEIs must be 15 digits; a failed check digit
    is stored only when the user explicitly confirmed it (some cheap phones carry invalid IMEIs)."""
    v = re.sub(r"[\s\-]", "", value or "").upper()
    if type_ in ("imei1", "imei2"):
        if not re.fullmatch(r"\d{15}", v):
            raise DomainError(
                "IMEI must be exactly 15 digits.",
                code="imei.invalid_format",
                status=400,
                fields={"value": ["imei.invalid_format"]},
            )
        try:
            validate_imei_luhn(v)
            return v, True
        except DjangoValidationError:
            if not confirm_invalid:
                raise DomainError(
                    "IMEI check digit is wrong.",
                    code="imei.invalid_check_digit",
                    status=400,
                    fields={"value": ["imei.invalid_check_digit"]},
                ) from None
            return v, False
    if not v or len(v) > 32:
        raise DomainError("Enter a serial number up to 32 characters.", code="validation.failed", status=400)
    return v, None


def create_device(*, shop, actor, customer, data: dict) -> Device:
    identifiers_data = data.pop("identifiers", [])
    types = [item["type"] for item in identifiers_data]
    if len(types) != len(set(types)):
        raise DomainError(
            "Duplicate identifier type on device.",
            code="device.duplicate_identifier_type",
            status=400,
            fields={"identifiers": ["device.duplicate_identifier_type"]},
        )

    cleaned_identifiers = []
    for item in identifiers_data:
        cleaned_val, luhn_valid = clean_identifier(
            item["type"],
            item["value"],
            confirm_invalid=item.get("confirm_invalid", False),
        )
        cleaned_identifiers.append(
            {
                "type": item["type"],
                "value": cleaned_val,
                "luhn_valid": luhn_valid,
                "captured_via": item.get("captured_via", DeviceIdentifier.CapturedVia.MANUAL),
            }
        )

    data.pop("shop", None)
    data.pop("created_by", None)
    with transaction.atomic():
        device = Device.objects.create(
            shop=shop,
            created_by=actor,
            customer=customer,
            **data,
        )
        for ident in cleaned_identifiers:
            DeviceIdentifier.objects.create(
                shop=shop,
                created_by=actor,
                device=device,
                type=ident["type"],
                value=ident["value"],
                luhn_valid=ident["luhn_valid"],
                captured_via=ident["captured_via"],
            )
    return device


def update_device(device: Device, *, actor, data: dict) -> Device:
    identifiers_data = data.pop("identifiers", None)
    with transaction.atomic():
        for field, value in data.items():
            setattr(device, field, value)
        device.save()

        if identifiers_data is not None:
            types = [item["type"] for item in identifiers_data]
            if len(types) != len(set(types)):
                raise DomainError(
                    "Duplicate identifier type on device.",
                    code="device.duplicate_identifier_type",
                    status=400,
                    fields={"identifiers": ["device.duplicate_identifier_type"]},
                )

            cleaned_identifiers = {}
            for item in identifiers_data:
                cleaned_val, luhn_valid = clean_identifier(
                    item["type"],
                    item["value"],
                    confirm_invalid=item.get("confirm_invalid", False),
                )
                cleaned_identifiers[item["type"]] = {
                    "value": cleaned_val,
                    "luhn_valid": luhn_valid,
                    "captured_via": item.get("captured_via", DeviceIdentifier.CapturedVia.MANUAL),
                }

            existing_idents = {ident.type: ident for ident in device.identifiers.all()}
            for type_name, ident_obj in existing_idents.items():
                if type_name not in cleaned_identifiers:
                    ident_obj.delete()

            for type_name, ident_info in cleaned_identifiers.items():
                if type_name in existing_idents:
                    ident_obj = existing_idents[type_name]
                    ident_obj.value = ident_info["value"]
                    ident_obj.luhn_valid = ident_info["luhn_valid"]
                    ident_obj.captured_via = ident_info["captured_via"]
                    ident_obj.save()
                else:
                    DeviceIdentifier.objects.create(
                        shop=device.shop,
                        created_by=actor,
                        device=device,
                        type=type_name,
                        value=ident_info["value"],
                        luhn_valid=ident_info["luhn_valid"],
                        captured_via=ident_info["captured_via"],
                    )

    return device
