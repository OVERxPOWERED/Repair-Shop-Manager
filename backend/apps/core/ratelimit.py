import time

from django.core.cache import cache

from apps.core.net import get_client_ip


def allow_request(request, *, scope: str, limit: int, window_seconds: int) -> bool:
    """Fixed-window rate limiter using the Django cache."""
    window = int(time.time() // window_seconds)
    ip = get_client_ip(request) or "unknown"
    key = f"rl:{scope}:{ip}:{window}"
    added = cache.add(key, 1, timeout=window_seconds)
    count = 1 if added else cache.incr(key)
    return count <= limit
