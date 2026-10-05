"""Settings used by pytest. Same database engine as production (PostgreSQL)."""

from .base import *  # noqa: F403

DEBUG = False
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
OTP_TEST_NUMBERS = {"+919999999999": "123456"}
FIELD_ENCRYPTION_KEYS = ["z0Tw0E-Yel8Nh9WgdNz1bs-5N5XAo9dQWVi8VeeYZ-U="]
IS_TESTING = True
