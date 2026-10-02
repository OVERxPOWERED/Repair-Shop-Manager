"""
Serializers for accounts and authentication.
"""

import re

from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.accounts.models import UserDevice

User = get_user_model()

# Regex for E.164 phone numbers (e.g. +919876543210 or 10-digit Indian numbers auto-prefixed)
PHONE_REGEX = re.compile(r"^\+[1-9]\d{1,14}$")


def normalize_phone(value: str) -> str:
    cleaned = value.strip().replace(" ", "").replace("-", "")
    if not cleaned.startswith("+"):
        # Auto-prefix +91 for 10-digit Indian numbers
        cleaned = f"+91{cleaned}" if len(cleaned) == 10 and cleaned.isdigit() else f"+{cleaned}"
    if not PHONE_REGEX.match(cleaned):
        raise serializers.ValidationError("Enter a valid phone number in E.164 format (e.g. +919876543210).")
    return cleaned


class SendOTPSerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=20)
    device_id = serializers.CharField(max_length=128, required=False, allow_blank=True)
    platform = serializers.ChoiceField(choices=["android", "ios", "web"], default="web")

    def validate_phone(self, value):
        return normalize_phone(value)


class VerifyOTPSerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=20)
    code = serializers.CharField(min_length=6, max_length=6)
    device_id = serializers.CharField(max_length=128, required=False, allow_blank=True)
    platform = serializers.ChoiceField(choices=["android", "ios", "web"], default="web")
    app_version = serializers.CharField(max_length=32, required=False, allow_blank=True, default="")

    def validate_phone(self, value):
        return normalize_phone(value)

    def validate_code(self, value):
        cleaned = value.strip()
        if not cleaned.isdigit() or len(cleaned) != 6:
            raise serializers.ValidationError("OTP code must be exactly 6 numeric digits.")
        return cleaned


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id",
            "phone",
            "name",
            "email",
            "preferred_locale",
            "is_active",
            "is_platform_admin",
            "last_login_at",
            "created_at",
        )
        read_only_fields = ("id", "phone", "is_platform_admin", "last_login_at", "created_at")


class UserDeviceSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserDevice
        fields = ("id", "device_id", "platform", "app_version", "last_seen_at")
        read_only_fields = ("id", "last_seen_at")
