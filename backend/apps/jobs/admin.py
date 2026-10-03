from django.contrib import admin

from apps.jobs.models import Job, JobAccessory, JobCounter, JobNote, JobStatusHistory


class JobAccessoryInline(admin.TabularInline):
    model = JobAccessory
    extra = 0


class JobNoteInline(admin.TabularInline):
    model = JobNote
    extra = 0


class JobStatusHistoryInline(admin.TabularInline):
    model = JobStatusHistory
    extra = 0
    readonly_fields = ("from_status", "to_status", "changed_by", "changed_at", "note")
    can_delete = False


@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = ("job_no", "shop", "customer", "device", "status", "priority", "received_at", "total_paise")
    list_filter = ("status", "priority", "kind", "shop")
    search_fields = ("job_no", "customer__name", "customer__phone", "device__model")
    inlines = [JobAccessoryInline, JobNoteInline, JobStatusHistoryInline]


@admin.register(JobCounter)
class JobCounterAdmin(admin.ModelAdmin):
    list_display = ("shop", "last_job_no")
