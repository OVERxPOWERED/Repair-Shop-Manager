from cryptography.fernet import Fernet, MultiFernet
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured


def _fernet() -> MultiFernet:
    # First key encrypts; all keys decrypt (allows key rotation).
    keys = getattr(settings, "FIELD_ENCRYPTION_KEYS", [])
    if not keys:
        raise ImproperlyConfigured("FIELD_ENCRYPTION_KEYS is not configured.")
    return MultiFernet([Fernet(k.encode()) for k in keys])


def encrypt_str(value: str) -> bytes:
    return _fernet().encrypt(value.encode())


def decrypt_str(token: bytes | memoryview) -> str:
    return _fernet().decrypt(bytes(token)).decode()
