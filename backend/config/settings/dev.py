"""Development settings."""

from .base import *  # noqa: F403

DEBUG = True
ALLOWED_HOSTS = ["*"]
OTP_TEST_NUMBERS = OTP_TEST_NUMBERS or {"+919999999999": "123456"}  # noqa: F405
FIELD_ENCRYPTION_KEYS = FIELD_ENCRYPTION_KEYS or ["z0Tw0E-Yel8Nh9WgdNz1bs-5N5XAo9dQWVi8VeeYZ-U="]  # noqa: F405
