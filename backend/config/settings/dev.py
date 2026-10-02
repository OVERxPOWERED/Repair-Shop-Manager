"""
Development settings for FixPro API.
"""
import os

from .base import *

DEBUG = True

ALLOWED_HOSTS = ['*']

# Database configuration
DB_NAME = os.environ.get('DB_NAME', 'fixpro_db')
DB_USER = os.environ.get('DB_USER', 'fixpro_user')
DB_PASSWORD = os.environ.get('DB_PASSWORD', 'fixpro_dev_password')
DB_HOST = os.environ.get('DB_HOST', 'localhost')
DB_PORT = os.environ.get('DB_PORT', '5432')

if os.environ.get('USE_SQLITE', 'false').lower() == 'true':
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': DB_NAME,
            'USER': DB_USER,
            'PASSWORD': DB_PASSWORD,
            'HOST': DB_HOST,
            'PORT': DB_PORT,
        }
    }

# Disable DRF throttling in development
REST_FRAMEWORK['DEFAULT_THROTTLE_CLASSES'] = []
REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] = {}
