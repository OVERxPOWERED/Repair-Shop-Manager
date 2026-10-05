#!/bin/sh
set -e

echo "==> Running database migrations..."
python manage.py migrate --noinput

echo "==> Ensuring cache table exists..."
python manage.py createcachetable || true

echo "==> Collecting static assets..."
python manage.py collectstatic --noinput

echo "==> Starting Gunicorn on port ${PORT:-8000}..."
exec gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 2 --timeout 60
