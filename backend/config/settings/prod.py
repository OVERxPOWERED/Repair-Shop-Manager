"""Production settings. Every secret comes from the environment."""

import os

import dj_database_url
import sentry_sdk
from django.core.exceptions import ImproperlyConfigured
from sentry_sdk.integrations.django import DjangoIntegration

from .base import *  # noqa: F403
from .base import SIMPLE_JWT

DEBUG = False

SECRET_KEY = os.environ.get("SECRET_KEY", "")
if len(SECRET_KEY) < 50 or SECRET_KEY.startswith("fixpro-"):
    raise ImproperlyConfigured("Set SECRET_KEY to a random value of at least 50 characters.")
SIMPLE_JWT["SIGNING_KEY"] = SECRET_KEY  # base.py captured the insecure default; replace it

ALLOWED_HOSTS = [h.strip() for h in os.environ.get("ALLOWED_HOSTS", "").split(",") if h.strip()]
if not ALLOWED_HOSTS:
    raise ImproperlyConfigured("Set ALLOWED_HOSTS.")
CSRF_TRUSTED_ORIGINS = [o.strip() for o in os.environ.get("CSRF_TRUSTED_ORIGINS", "").split(",") if o.strip()]

DATABASES = {"default": dj_database_url.config(conn_max_age=600, ssl_require=True)}

STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}

MEDIA_BUCKET = os.environ.get("MEDIA_BUCKET")
if MEDIA_BUCKET:
    STORAGES["default"] = {
        "BACKEND": "storages.backends.s3.S3Storage",
        "OPTIONS": {
            "bucket_name": MEDIA_BUCKET,
            "endpoint_url": os.environ.get("MEDIA_S3_ENDPOINT"),
            "access_key": os.environ.get("MEDIA_S3_KEY_ID"),
            "secret_key": os.environ.get("MEDIA_S3_SECRET"),
            "region_name": "auto",
            "default_acl": "private",
            "querystring_auth": True,
            "querystring_expire": 300,  # signed URLs valid for 5 minutes
            "file_overwrite": False,
        },
    }


SENTRY_DSN = os.environ.get("SENTRY_DSN")
if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[DjangoIntegration()],
        traces_sample_rate=0.1,
        send_default_pii=False,
        release=os.environ.get("APP_VERSION"),
    )

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = os.environ.get("SECURE_SSL_REDIRECT", "true").lower() == "true"
SECURE_HSTS_SECONDS = int(os.environ.get("SECURE_HSTS_SECONDS", "3600"))  # raise to 31536000 after the pilot
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
SILENCED_SYSTEM_CHECKS = ["security.W021"]  # HSTS preload is a long-term commitment; decide later

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.db.DatabaseCache",
        "LOCATION": "django_cache",
    }
}
CRON_SECRET = os.environ.get("CRON_SECRET", "")

if not FIELD_ENCRYPTION_KEYS:  # noqa: F405
    raise ImproperlyConfigured("Set FIELD_ENCRYPTION_KEYS to one or more comma-separated Fernet keys.")
