import datetime

from django.db.models import Count, Q
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers as drf_serializers
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.audit.services import record_audit
from apps.core.api.concurrency import expected_version
from apps.core.api.errors import ConflictError, DomainError, NotFoundError
from apps.core.api.idempotency import idempotent
from apps.core.time import IST, today_ist
from apps.jobs.filters import JobFilter
from apps.jobs.models import Job, JobNote, JobPhoto, JobStatus
from apps.jobs.serializers import (
    DashboardSummarySerializer,
    JobAssignSerializer,
    JobCountsSerializer,
    JobCreateSerializer,
    JobNoteSerializer,
    JobPhotoSerializer,
    JobPhotoUploadSerializer,
    JobReopenSerializer,
    JobSerializer,
    JobStatusChangeSerializer,
    JobStatusHistorySerializer,
    JobUpdateSerializer,
)
from apps.jobs.services import (
    add_job_photo,
    assign_job,
    change_status,
    create_job,
    delete_job_photo,
    reopen_job,
    reveal_lock,
    update_job,
)
from apps.jobs.state_machine import GROUPS, allowed_next
from apps.tenancy.permissions import IsShopMember
from apps.tenancy.viewsets import ShopScopedViewSet


class JobViewSet(ShopScopedViewSet):
    queryset = Job.objects.all()
    serializer_class = JobSerializer
    filterset_class = JobFilter
    ordering_fields = ["updated_at", "created_at", "expected_date"]
    ordering = ["-updated_at"]

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
        "status": "jobs.change_status",
        "transitions": "jobs.view",
        "reopen": "jobs.reopen",
        "assign": "jobs.assign",
        "history": "jobs.view",
        "counts": "jobs.view",
    }
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_serializer_class(self):
        if self.action == "create":
            return JobCreateSerializer
        if self.action == "partial_update":
            return JobUpdateSerializer
        if self.action == "status":
            return JobStatusChangeSerializer
        if self.action == "reopen":
            return JobReopenSerializer
        if self.action == "assign":
            return JobAssignSerializer
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

        m = getattr(self.request, "membership", None)
        if m and not (m.has_perm("jobs.view_all") or not m.shop.engineers_see_assigned_only):
            qs = qs.filter(assigned_to=m)

        return qs.select_related(
            "customer", "device", "device__brand", "assigned_to", "assigned_to__user"
        ).prefetch_related("accessories", "device__identifiers")

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

    @action(detail=True, methods=["post"])
    def status(self, request, pk=None):
        job = self.get_object()
        serializer = JobStatusChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            version = expected_version(request)
        except DomainError as err:
            if "expected_version" in request.data:
                try:
                    version = int(request.data["expected_version"])
                except (ValueError, TypeError):
                    raise err from None
            else:
                raise err from None

        updated = change_status(
            job=job,
            to_status=serializer.validated_data["to_status"],
            actor=request.user,
            membership=request.membership,
            note=serializer.validated_data.get("note", ""),
            cancel_reason=serializer.validated_data.get("cancel_reason", ""),
            expected_version=version,
            request=request,
        )
        return Response(JobSerializer(updated, context={"request": request}).data)

    @extend_schema(
        responses={
            200: inline_serializer(
                name="AllowedTransitionsResponse",
                fields={"allowed": drf_serializers.ListField(child=drf_serializers.CharField())},
            )
        }
    )
    @action(detail=True, methods=["get"])
    def transitions(self, request, pk=None):
        job = self.get_object()
        return Response({"allowed": allowed_next(job, request.membership)})

    @action(detail=True, methods=["post"])
    def reopen(self, request, pk=None):
        job = self.get_object()
        serializer = JobReopenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reopened = reopen_job(
            job=job,
            actor=request.user,
            membership=request.membership,
            reason=serializer.validated_data["reason"],
            request=request,
        )
        return Response(JobSerializer(reopened, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def assign(self, request, pk=None):
        job = self.get_object()
        serializer = JobAssignSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        assigned = assign_job(
            job=job,
            membership_id=serializer.validated_data.get("membership_id"),
            actor=request.user,
            membership=request.membership,
            request=request,
        )
        return Response(JobSerializer(assigned, context={"request": request}).data)

    @action(detail=True, methods=["get"])
    def history(self, request, pk=None):
        job = self.get_object()
        history_qs = job.status_history.all().select_related("changed_by").order_by("changed_at")
        return Response(JobStatusHistorySerializer(history_qs, many=True).data)

    @extend_schema(responses={200: JobCountsSerializer})
    @action(detail=False, methods=["get"])
    def counts(self, request):
        qs = self.get_queryset()
        counts_data = qs.aggregate(
            all=Count("id"),
            pending=Count("id", filter=Q(status__in=GROUPS["pending"])),
            in_progress=Count("id", filter=Q(status__in=GROUPS["in_progress"])),
            repaired=Count("id", filter=Q(status__in=GROUPS["repaired"])),
            delivered=Count("id", filter=Q(status__in=GROUPS["delivered"])),
            closed=Count("id", filter=Q(status__in=GROUPS["closed"])),
        )
        return Response(counts_data)

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


class DashboardSummaryView(APIView):
    permission_classes = [IsShopMember]

    @extend_schema(
        responses={200: DashboardSummarySerializer},
        parameters=[
            inline_serializer(
                name="DashboardDateParam",
                fields={"date": drf_serializers.DateField(required=False)},
            )
        ],
    )
    def get(self, request, *args, **kwargs):
        membership = getattr(request, "membership", None)
        if not membership or not membership.has_perm("jobs.view"):
            raise DomainError(
                "You do not have permission to view repair jobs.",
                code="permission.denied",
                status=403,
            )

        date_param = request.query_params.get("date")
        if date_param:
            try:
                target_date = datetime.datetime.strptime(date_param, "%Y-%m-%d").date()
            except ValueError:
                raise DomainError(
                    "Invalid date format; expected YYYY-MM-DD.",
                    code="validation.failed",
                    status=400,
                ) from None
        else:
            target_date = today_ist()

        start_of_day_ist = datetime.datetime.combine(target_date, datetime.time.min, tzinfo=IST)
        end_of_day_ist = datetime.datetime.combine(target_date, datetime.time.max, tzinfo=IST)
        start_utc = start_of_day_ist.astimezone(datetime.UTC)
        end_utc = end_of_day_ist.astimezone(datetime.UTC)

        qs = Job.objects.filter(shop=request.shop)
        if not (membership.has_perm("jobs.view_all") or not request.shop.engineers_see_assigned_only):
            qs = qs.filter(assigned_to=membership)

        summary = qs.aggregate(
            received_today=Count("id", filter=Q(received_at__range=(start_utc, end_utc))),
            pending=Count("id", filter=Q(status__in=GROUPS["pending"])),
            in_progress=Count("id", filter=Q(status__in=GROUPS["in_progress"])),
            repaired=Count("id", filter=Q(status__in=GROUPS["repaired"])),
            delivered_today=Count("id", filter=Q(delivered_at__range=(start_utc, end_utc))),
        )
        return Response(summary)
