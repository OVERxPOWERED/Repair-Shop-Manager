from django.conf import settings


def get_client_ip(request) -> str | None:
    """Same rule DRF throttling uses: trust NUM_PROXIES entries of X-Forwarded-For."""
    num_proxies = settings.REST_FRAMEWORK.get("NUM_PROXIES") or 0
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if num_proxies and forwarded:
        addresses = [a.strip() for a in forwarded.split(",")]
        return addresses[-min(num_proxies, len(addresses))]
    return request.META.get("REMOTE_ADDR")
