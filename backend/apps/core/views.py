"""
Core views including system health check.
"""

import logging

from django.conf import settings
from django.db import DatabaseError, connection
from django.utils import timezone
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger(__name__)


class HealthCheckView(APIView):
    """
    Public health check endpoint.
    Verifies service liveness and database connectivity.
    """

    permission_classes = (AllowAny,)
    throttle_classes = ()

    @extend_schema(
        summary="Service Health Check",
        description="Returns system liveness, version, and database connection status.",
        responses={200: inline_serializer(name="HealthCheckResponse", fields={"data": serializers.DictField()})},
    )
    def get(self, request):
        database = "connected"
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
        except DatabaseError:
            logger.exception("Health check: database unavailable")
            database = "unavailable"  # never leak driver error text publicly
        healthy = database == "connected"
        return Response(
            {
                "status": "healthy" if healthy else "degraded",
                "service": "fixpro-api",
                "version": settings.APP_VERSION,
                "timestamp": timezone.now().isoformat(),
                "database": database,
            },
            status=status.HTTP_200_OK if healthy else status.HTTP_503_SERVICE_UNAVAILABLE,
        )
