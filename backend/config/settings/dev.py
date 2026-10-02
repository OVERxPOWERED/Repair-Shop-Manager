"""Development settings."""

from .base import *  # noqa: F403

DEBUG = True
ALLOWED_HOSTS = ["*"]
OTP_TEST_NUMBERS = OTP_TEST_NUMBERS or {"+919999999999": "123456"}  # noqa: F405
