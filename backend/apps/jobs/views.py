from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.audit.services import record_audit
from apps.core.api.concurrency import expected_version
from apps.core.api.errors import ConflictError, DomainError, NotFoundError
from apps.core.api.idempotency import idempotent
from apps.jobs.models import Job, JobNote, JobPhoto, JobStatus
from apps.jobs.serializers import (
    JobCreateSerializer,
    JobNoteSerializer,
    JobPhotoSerializer,
    JobPhotoUploadSerializer,
    JobSerializer,
    JobUpdateSerializer,
)
from apps.jobs.services import (
    add_job_photo,
    create_job,
    delete_job_photo,
    reveal_lock,
    update_job,
)
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
        "photos": "jobs.view",
        "add_photo": "jobs.edit",
        "delete_photo": "jobs.edit",
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
        if self.action == "photos" and self.request.method.lower() == "post":
            return self.permission_map.get("add_photo")
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

    @action(detail=True, methods=["get", "post"])
    @idempotent(required=False)
    def photos(self, request, pk=None):
        job = self.get_object()
        if request.method.lower() == "get":
            photos_qs = job.photos.all().order_by("created_at")
            return Response(JobPhotoSerializer(photos_qs, many=True).data)

        # POST: upload photo
        serializer = JobPhotoUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        photo = add_job_photo(
            job=job,
            actor=request.user,
            upload=serializer.validated_data["file"],
            kind=serializer.validated_data.get("kind", JobPhoto.Kind.BEFORE),
            caption=serializer.validated_data.get("caption", ""),
            request=request,
        )
        return Response(JobPhotoSerializer(photo).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"], url_path=r"photos/(?P<photo_id>[0-9a-fA-F-]+)")
    def delete_photo(self, request, pk=None, photo_id=None):
        job = self.get_object()
        try:
            photo = job.photos.get(id=photo_id, deleted_at__isnull=True)
        except (JobPhoto.DoesNotExist, ValueError):
            raise NotFoundError("Photo not found.", code="photo.not_found") from None
        delete_job_photo(photo=photo, actor=request.user, request=request)
        return Response(status=status.HTTP_204_NO_CONTENT)
