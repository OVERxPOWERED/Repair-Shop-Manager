from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.audit.services import record_audit
from apps.core.api.concurrency import expected_version
from apps.core.api.errors import ConflictError, DomainError
from apps.core.api.idempotency import idempotent
from apps.jobs.models import Job, JobNote, JobStatus
from apps.jobs.serializers import (
    JobCreateSerializer,
    JobNoteSerializer,
    JobSerializer,
    JobUpdateSerializer,
)
from apps.jobs.services import create_job, reveal_lock, update_job
from apps.tenancy.viewsets import ShopScopedViewSet


class JobViewSet(ShopScopedViewSet):
    queryset = Job.objects.all()
    serializer_class = JobSerializer

    permission_map = {
        "list": "jobs.view",
        "retrieve": "jobs.view",
        "create": "jobs.create",
        "update": "jobs.edit",
        "partial_update": "jobs.edit",
        "destroy": "jobs.delete",
        "lock": "jobs.view_device_lock",
        "notes": "jobs.view",
        "add_note": "jobs.edit",
    }
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_serializer_class(self):
        if self.action == "create":
            return JobCreateSerializer
        if self.action == "partial_update":
            return JobUpdateSerializer
        return JobSerializer

    def get_required_permission(self) -> str | None:
        if self.action == "notes" and self.request.method.lower() == "post":
            return self.permission_map.get("add_note")
        return super().get_required_permission()

    def get_queryset(self):
        qs = super().get_queryset()
        if getattr(self, "swagger_fake_view", False):
            return qs.none()

        customer_id = self.request.query_params.get("customer")
        if customer_id:
            qs = qs.filter(customer_id=customer_id)

        return (
            qs.select_related("customer", "device", "device__brand", "assigned_to", "assigned_to__user")
            .prefetch_related("accessories", "device__identifiers")
            .order_by("-created_at")
        )

    @idempotent()
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        job = create_job(
            shop=request.shop,
            actor=request.user,
            membership=request.membership,
            data=serializer.validated_data,
            request=request,
        )
        return Response(JobSerializer(job, context={"request": request}).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        job = self.get_object()
        serializer = self.get_serializer(job, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        version = expected_version(request)
        updated = update_job(
            job=job,
            actor=request.user,
            membership=request.membership,
            data=serializer.validated_data,
            expected_version=version,
            request=request,
        )
        return Response(JobSerializer(updated, context={"request": request}).data)

    def destroy(self, request, *args, **kwargs):
        job = self.get_object()
        if job.status not in (JobStatus.RECEIVED, JobStatus.CANCELLED):
            raise ConflictError(
                "Cannot delete a repair job that is currently in progress.",
                code="job.cannot_delete_in_progress",
            )
        record_audit(
            actor=request.user,
            shop=request.shop,
            request=request,
            action="job.deleted",
            entity=job,
            before={"job_no": job.job_no, "status": job.status},
        )
        job.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["get"])
    def lock(self, request, pk=None):
        job = self.get_object()
        data = reveal_lock(job=job, actor=request.user, request=request)
        return Response(data)

    @action(detail=True, methods=["get", "post"])
    def notes(self, request, pk=None):
        job = self.get_object()
        if request.method.lower() == "get":
            notes_qs = job.notes.all().select_related("author").order_by("created_at")
            return Response(JobNoteSerializer(notes_qs, many=True).data)

        # POST: add note
        body = (request.data.get("body") or "").strip()
        if not body:
            raise DomainError("Note body cannot be empty.", code="validation.failed", status=400)
        visibility = request.data.get("visibility", JobNote.Visibility.INTERNAL)
        if visibility not in (JobNote.Visibility.INTERNAL, JobNote.Visibility.CUSTOMER):
            raise DomainError("Invalid visibility choice.", code="validation.failed", status=400)

        note = JobNote.objects.create(
            shop=request.shop,
            job=job,
            author=request.user,
            body=body,
            visibility=visibility,
            created_by=request.user,
        )
        return Response(JobNoteSerializer(note).data, status=status.HTTP_201_CREATED)
