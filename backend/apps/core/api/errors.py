"""Domain errors with stable, dotted, lowercase codes. Every code is listed in docs/error-codes.md."""

from rest_framework import status as http
from rest_framework.exceptions import APIException


class DomainError(APIException):
    status_code = http.HTTP_422_UNPROCESSABLE_ENTITY
    default_detail = "Business rule violated."
    default_code = "business.rule_violated"

    def __init__(self, message=None, *, code=None, status=None, fields=None, wait=None):
        super().__init__(detail=message or self.default_detail, code=code or self.default_code)
        self.error_code = code or self.default_code
        if status is not None:
            self.status_code = status
        self.fields = fields or {}
        self.wait = wait  # seconds; sent as Retry-After


class ConflictError(DomainError):
    status_code = http.HTTP_409_CONFLICT
    default_detail = "This record changed. Reload and try again."
    default_code = "conflict"


class NotFoundError(DomainError):
    status_code = http.HTTP_404_NOT_FOUND
    default_detail = "Not found."
    default_code = "not_found"
