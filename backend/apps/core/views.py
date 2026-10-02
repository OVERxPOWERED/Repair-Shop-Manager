"""
Core views including system health check.
"""
from django.db import DatabaseError, connection
from django.utils import timezone
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthCheckView(APIView):
    """
    Public health check endpoint.
    Verifies service liveness and database connectivity.
    """
    permission_classes = (AllowAny,)

    @extend_schema(
        summary="Service Health Check",
        description="Returns system liveness, version, and database connection status.",
        responses={
            200: inline_serializer(
                name='HealthCheckResponse',
                fields={
                    'data': serializers.DictField()
                }
            )
        }
    )
    def get(self, request):
        db_status = "connected"
        http_status = status.HTTP_200_OK

        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1;")
                cursor.fetchone()
        except DatabaseError as e:
            db_status = f"unhealthy: {e!s}"
            http_status = status.HTTP_503_SERVICE_UNAVAILABLE

        payload = {
            "data": {
                "status": "healthy" if http_status == status.HTTP_200_OK else "degraded",
                "version": "1.0.0",
                "service": "fixpro-api",
                "timestamp": timezone.now().isoformat(),
                "database": db_status
            }
        }
        return Response(payload, status=http_status)
