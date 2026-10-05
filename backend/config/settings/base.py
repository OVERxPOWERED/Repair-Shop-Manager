"""
Base settings for FixPro API.
"""

import os
from datetime import timedelta
from pathlib import Path

import dj_database_url
from corsheaders.defaults import default_headers
from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Load environment variables from .env if present
load_dotenv(BASE_DIR.parent / ".env")
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.environ.get("SECRET_KEY", "fixpro-insecure-base-key-change-me")
DEBUG = False
ALLOWED_HOSTS = [h.strip() for h in os.environ.get("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",") if h.strip()]

DATABASES = {
    "default": dj_database_url.config(
        default="postgres://fixpro_user:fixpro_dev_password@localhost:5432/fixpro_db",
        conn_max_age=0,
    )
}
APP_VERSION = os.environ.get("APP_VERSION", "0.0.0-dev")

# Application definition
DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.postgres",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_filters",
    "drf_spectacular",
]

LOCAL_APPS = [
    "apps.core.apps.CoreConfig",
    "apps.accounts.apps.AccountsConfig",
    "apps.tenancy.apps.TenancyConfig",
    "apps.audit.apps.AuditConfig",
    "apps.customers.apps.CustomersConfig",
    "apps.devices.apps.DevicesConfig",
    "apps.jobs.apps.JobsConfig",
    "apps.billing.apps.BillingConfig",
    "apps.documents.apps.DocumentsConfig",
    "apps.tracking.apps.TrackingConfig",
    "apps.messaging.apps.MessagingConfig",
    "apps.inventory.apps.InventoryConfig",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

AUTH_USER_MODEL = "accounts.User"

MIDDLEWARE = [
    "apps.core.middleware.RequestIdMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# Internationalization
LANGUAGE_CODE = "en"
TIME_ZONE = "Asia/Kolkata"  # Rule 9: Store UTC, display IST
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# REST Framework Configuration
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ("apps.accounts.authentication.DeviceJWTAuthentication",),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_RENDERER_CLASSES": ("apps.core.api.renderers.EnvelopeJSONRenderer",),
    "DEFAULT_PARSER_CLASSES": (
        "rest_framework.parsers.JSONParser",
        "rest_framework.parsers.MultiPartParser",
        "rest_framework.parsers.FormParser",
    ),
    "EXCEPTION_HANDLER": "apps.core.api.exceptions.api_exception_handler",
    "DEFAULT_PAGINATION_CLASS": "apps.core.api.pagination.EnvelopePagination",
    "PAGE_SIZE": 25,
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_THROTTLE_CLASSES": (
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ),
    "DEFAULT_THROTTLE_RATES": {
        "anon": "60/min",
        "user": "600/min",
        "otp_send": "10/hour",  # per IP; per-phone limits live in the OTP service
        "otp_verify": "30/hour",
        "token_refresh": "120/hour",
        "tracking": "60/min",
    },
    # Number of trusted reverse proxies in front of Django (Render = 1? TODO(verify)). 0 locally.
    "NUM_PROXIES": int(os.environ.get("NUM_PROXIES", "0")) or None,
    "TEST_REQUEST_DEFAULT_FORMAT": "json",
}

# DRF Spectacular OpenAPI documentation
SPECTACULAR_SETTINGS = {
    "TITLE": "FixPro API",
    "DESCRIPTION": "Multi-tenant management backend for mobile & electronics repair shops",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "SCHEMA_PATH_PREFIX": r"/api/v[0-9]+",
    "POSTPROCESSING_HOOKS": [
        "drf_spectacular.hooks.postprocess_schema_enums",
        "apps.core.api.schema.wrap_responses_in_envelope",
    ],
    "COMPONENT_SPLIT_REQUEST": True,
}

# CORS Configuration
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get(
        "CORS_ALLOWED_ORIGINS",
        # https://localhost = Android WebView (androidScheme https); capacitor://localhost = iOS
        # http://localhost:3000 = Next.js dev
        "http://localhost:3000,http://127.0.0.1:3000,http://localhost,https://localhost,capacitor://localhost",
    ).split(",")
    if origin.strip()
]
CORS_ALLOW_CREDENTIALS = False  # we use Authorization headers, not cookies
CORS_ALLOW_HEADERS = (
    *default_headers,
    "x-shop-id",
    "idempotency-key",
    "if-match",
    "x-app-version",
    "x-request-id",
)
CORS_EXPOSE_HEADERS = ["X-Request-Id", "Retry-After"]

# SimpleJWT Authentication Configuration
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=30),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": False,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
}

SMS_PROVIDER = os.environ.get("SMS_PROVIDER", "apps.core.sms.ConsoleSmsProvider")
SMS_API_KEY = os.environ.get("SMS_API_KEY", "")
SMS_SENDER_ID = os.environ.get("SMS_SENDER_ID", "FIXPRO")
SMS_DLT_OTP_TE_ID = os.environ.get("SMS_DLT_OTP_TE_ID", "")


def _parse_otp_test_numbers(raw: str) -> dict[str, str]:
    """'+919999999999:123456,+919888888888:654321' -> {phone: code}. Reviewer/dev accounts only."""
    pairs = (item.split(":", 1) for item in raw.split(",") if ":" in item)
    return {phone.strip(): code.strip() for phone, code in pairs}


OTP_TEST_NUMBERS = _parse_otp_test_numbers(os.environ.get("OTP_TEST_NUMBERS", ""))
GOOGLE_CLIENT_IDS = [cid.strip() for cid in os.environ.get("GOOGLE_CLIENT_IDS", "").split(",") if cid.strip()]

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {"plain": {"format": "%(asctime)s %(levelname)s %(name)s %(message)s"}},
    "handlers": {"console": {"class": "logging.StreamHandler", "formatter": "plain"}},
    "root": {"handlers": ["console"], "level": os.environ.get("LOG_LEVEL", "INFO")},
}

CRON_SECRET = os.environ.get("CRON_SECRET", "dev-cron-secret")

FIELD_ENCRYPTION_KEYS = [k.strip() for k in os.environ.get("FIELD_ENCRYPTION_KEYS", "").split(",") if k.strip()]

PUBLIC_TRACKING_BASE_URL = os.environ.get("PUBLIC_TRACKING_BASE_URL", "https://track.fixpro.in")

# Request size limits: 2.5 MB explicitly to prevent memory exhaustion from oversized JSON
DATA_UPLOAD_MAX_MEMORY_SIZE = 2621440

SILENCED_SYSTEM_CHECKS = [
    "drf_spectacular.W001",
    "drf_spectacular.W002",
]
