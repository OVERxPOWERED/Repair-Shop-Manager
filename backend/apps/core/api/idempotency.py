"""
@idempotent() for POST handlers. Usage on a ViewSet:

    @idempotent()
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)
"""

import functools
import hashlib
import json
import uuid

from django.core.serializers.json import DjangoJSONEncoder
from django.db import IntegrityError, transaction
from rest_framework.response import Response

from apps.core.models import IdempotencyRecord

from .errors import ConflictError, DomainError

HEADER = "Idempotency-Key"


def _request_hash(request) -> str:
    payload = json.dumps(request.data, sort_keys=True, cls=DjangoJSONEncoder, default=str)
    return hashlib.sha256(f"{request.method}:{request.path}:{payload}".encode()).hexdigest()


def idempotent(required: bool = True):
    def decorator(handler):
        @functools.wraps(handler)
        def wrapper(self, request, *args, **kwargs):
            raw = request.headers.get(HEADER)
            if not raw:
                if required:
                    raise DomainError(
                        "Idempotency-Key header is required.", code="idempotency.key_required", status=400
                    )
                return handler(self, request, *args, **kwargs)
            try:
                key = uuid.UUID(raw)
            except ValueError:
                raise DomainError(
                    "Idempotency-Key must be a UUID.", code="idempotency.key_invalid", status=400
                ) from None

            req_hash = _request_hash(request)
            try:
                with transaction.atomic():
                    record = IdempotencyRecord.objects.create(
                        user=request.user,
                        key=key,
                        method=request.method,
                        path=request.path[:255],
                        request_hash=req_hash,
                    )
            except IntegrityError:
                record = IdempotencyRecord.objects.get(user=request.user, key=key)
                if record.request_hash != req_hash:
                    raise DomainError(
                        "This Idempotency-Key was already used for a different request.",
                        code="idempotency.key_reused",
                        status=422,
                    ) from None
                if record.status_code is None:
                    raise ConflictError(
                        "The original request is still processing.", code="idempotency.in_progress"
                    ) from None
                replay = Response(record.response_body, status=record.status_code)
                replay["Idempotent-Replayed"] = "true"
                return replay

            try:
                response = handler(self, request, *args, **kwargs)
            except Exception:
                record.delete()  # failed requests may be retried with the same key
                raise
            if 200 <= response.status_code < 300:
                record.status_code = response.status_code
                record.response_body = json.loads(json.dumps(response.data, cls=DjangoJSONEncoder))
                record.save(update_fields=["status_code", "response_body"])
            else:
                record.delete()
            return response

        return wrapper

    return decorator
