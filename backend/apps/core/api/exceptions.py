"""Turns every API error into {"error": {code, message, fields, request_id}}."""

import logging

from django.conf import settings
from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import Http404
from rest_framework import exceptions as drf
from rest_framework.response import Response
from rest_framework.serializers import as_serializer_error
from rest_framework.views import exception_handler as drf_exception_handler

from .errors import DomainError

logger = logging.getLogger("fixpro.api")

# Order matters: first match wins (subclasses before parents).
DEFAULT_CODES = (
    (drf.NotAuthenticated, "auth.not_authenticated"),
    (drf.AuthenticationFailed, "auth.token_invalid"),  # includes SimpleJWT InvalidToken (expired too)
    (drf.PermissionDenied, "permission.denied"),
    (drf.NotFound, "not_found"),
    (drf.MethodNotAllowed, "request.method_not_allowed"),
    (drf.NotAcceptable, "request.not_acceptable"),
    (drf.UnsupportedMediaType, "request.unsupported_media_type"),
    (drf.ParseError, "request.malformed"),
    (drf.Throttled, "rate.limited"),
    (drf.ValidationError, "validation.failed"),
)


def _first_message(detail) -> str:
    if isinstance(detail, list | tuple) and detail:
        return _first_message(detail[0])
    if isinstance(detail, dict):
        return "Validation failed."
    return str(detail)


def api_exception_handler(exc, context):
    if isinstance(exc, Http404):
        exc = drf.NotFound()
    elif isinstance(exc, DjangoPermissionDenied):
        exc = drf.PermissionDenied()
    elif isinstance(exc, DjangoValidationError):
        exc = drf.ValidationError(as_serializer_error(exc))

    request = context.get("request")
    request_id = getattr(request, "request_id", None)
    response = drf_exception_handler(exc, context)

    if response is None:  # unexpected exception -> 500
        if settings.DEBUG:
            return None  # let Django show the debug page
        logger.exception("Unhandled API error request_id=%s", request_id)
        try:
            import sentry_sdk

            sentry_sdk.capture_exception(exc)
        except ImportError:
            pass
        body = {"code": "server.error", "message": "Something went wrong. Please try again.", "fields": {}}
        return Response({"error": {**body, "request_id": request_id}}, status=500)

    if isinstance(exc, DomainError):
        code, fields, message = exc.error_code, exc.fields, str(exc.detail)
        if exc.wait:
            response["Retry-After"] = str(int(exc.wait))
    elif isinstance(exc, drf.ValidationError):
        code, message = "validation.failed", "Please correct the highlighted fields."
        fields = response.data if isinstance(response.data, dict) else {"non_field_errors": response.data}
    else:
        code = next((c for cls, c in DEFAULT_CODES if isinstance(exc, cls)), "error")
        fields, message = {}, _first_message(exc.detail)

    response.data = {"error": {"code": code, "message": message, "fields": fields, "request_id": request_id}}
    return response
