import hmac

from django.conf import settings
from django.core.management import call_command
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.api.errors import DomainError, NotFoundError

# Name -> management command. Later subphases add entries (purge_trash, recurring_expenses, ...).
CRON_JOBS = {
    "purge-otp": "purge_otp_challenges",
    "purge-idempotency": "purge_idempotency_records",
}


class CronView(APIView):
    """Free hosting has no scheduler; GitHub Actions calls this with X-Cron-Secret."""

    authentication_classes = ()
    permission_classes = (permissions.AllowAny,)

    def post(self, request, job):
        secret = request.headers.get("X-Cron-Secret", "")
        if not settings.CRON_SECRET or not hmac.compare_digest(secret, settings.CRON_SECRET):
            raise DomainError("Forbidden.", code="permission.denied", status=403)
        if job not in CRON_JOBS:
            raise NotFoundError()
        call_command(CRON_JOBS[job])
        return Response({"job": job, "status": "ok"})
