"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  Phone,
  MessageCircle,
  Smartphone,
  User,
  Wrench,
  Clock,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Plus,
  Send,
  MoreVertical,
  RotateCcw,
  Edit,
  ShieldAlert,
  ShieldCheck,
  Loader2,
  CreditCard,
  FileText,
  Share2,
  Printer,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useJobInvoice, useCreateDraftFromJob } from "@/features/invoices/api";
import {
  useJob,
  useJobHistory,
  useJobNotes,
  useAddJobNote,
  useRevealJobLock,
  uploadJobPhotoDirect,
  useDeleteJobPhoto,
} from "@/features/jobs/api";
import { StatusBadge } from "@/features/jobs/components/StatusBadge";
import { PatternInput } from "@/features/jobs/components/PatternInput";
import { PhotoStrip } from "@/features/jobs/PhotoStrip";
import { AssignTechnicianSheet } from "@/features/jobs/components/AssignTechnicianSheet";
import { StatusChangeSheet } from "@/features/jobs/components/StatusChangeSheet";
import { ReopenJobDialog } from "@/features/jobs/components/ReopenJobDialog";
import { EditJobSheet } from "@/features/jobs/components/EditJobSheet";
import { JobShareSheet } from "@/features/jobs/components/JobShareSheet";
import { CheckImeiSheet } from "@/features/devices/CheckImeiSheet";
import { RepairDetailsSection } from "@/features/jobs/components/RepairDetailsSection";
import { LineItemSheet } from "@/features/jobs/components/LineItemSheet";
import { PaymentSheet } from "@/features/billing/PaymentSheet";
import { UpiQrModal } from "@/features/billing/UpiQrModal";
import { useCurrentShopDetails, type JobLineItem, type PaymentMode } from "@/features/billing/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatIMEI } from "@/lib/validation/imei";
import { formatDate, formatDateTime } from "@/lib/format/date";
import { formatPaise } from "@/lib/format/money";
import { usePermission } from "@/lib/auth/store";
import { useLocaleStore } from "@/i18n/store";

function JobDetailContent() {
  const t = useTranslations("jobs");
  const tNav = useTranslations("nav");
  const tDevices = useTranslations("devices");
  const tBilling = useTranslations("billing");
  const tInvoices = useTranslations("invoices");
  const tShare = useTranslations("share");
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocaleStore((s) => s.locale);

  const [checkImeiOpen, setCheckImeiOpen] = useState(false);
  const [checkImeiTarget, setCheckImeiTarget] = useState<string>("");

  const jobId = searchParams.get("id");

  const {
    data: job,
    isLoading: isLoadingJob,
    isError,
    refetch: refetchJob,
  } = useJob(jobId);

  const { data: history = [], isLoading: isLoadingHistory } = useJobHistory(jobId);
  const { data: notes = [], isLoading: isLoadingNotes } = useJobNotes(jobId);

  const addNoteMutation = useAddJobNote();
  const deletePhotoMutation = useDeleteJobPhoto();
  const revealLockMutation = useRevealJobLock();

  // Permissions (called unconditionally)
  const canSeeCostProfit = usePermission("money.see_cost_profit");
  const canViewInvoices = usePermission("invoices.view");
  const canCreateDraft = usePermission("invoices.create_draft");
  const canSeeMoney = canSeeCostProfit || canViewInvoices;
  const canAssign = usePermission("jobs.assign");
  const canViewLock = usePermission("jobs.view_device_lock");
  const canReopen = usePermission("jobs.reopen");
  const canEdit = usePermission("jobs.edit");
  const canRecordPayment = usePermission("payments.record");
  const { data: currentShop } = useCurrentShopDetails();

  // Invoices for this job
  const { data: jobInvoice } = useJobInvoice(jobId);
  const createInvoiceMutation = useCreateDraftFromJob();

  const handleCreateInvoice = async () => {
    if (!job) return;
    try {
      const inv = await createInvoiceMutation.mutateAsync(job.id);
      toast.success(tInvoices("createdDraftToast"));
      router.push(`/invoices/detail/?id=${inv.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : tInvoices("createError");
      toast.error(msg);
    }
  };

  // Dialog & Sheet States
  const [isAssignSheetOpen, setIsAssignSheetOpen] = useState(false);
  const [isStatusSheetOpen, setIsStatusSheetOpen] = useState(false);
  const [isReopenDialogOpen, setIsReopenDialogOpen] = useState(false);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);

  // Billing Sheet States
  const [isLineItemSheetOpen, setIsLineItemSheetOpen] = useState(false);
  const [lineItemToEdit, setLineItemToEdit] = useState<JobLineItem | null>(null);
  const [isPaymentSheetOpen, setIsPaymentSheetOpen] = useState(false);
  const [paymentDefaultMode, setPaymentDefaultMode] = useState<PaymentMode>("cash");
  const [focusPaymentReference, setFocusPaymentReference] = useState(false);
  const [isUpiQrOpen, setIsUpiQrOpen] = useState(false);

  const handleOpenAddLineItem = () => {
    setLineItemToEdit(null);
    setIsLineItemSheetOpen(true);
  };

  const handleEditLineItem = (item: JobLineItem) => {
    setLineItemToEdit(item);
    setIsLineItemSheetOpen(true);
  };

  const handleOpenPayment = (mode: PaymentMode = "cash", focusRef: boolean = false) => {
    setPaymentDefaultMode(mode);
    setFocusPaymentReference(focusRef);
    setIsPaymentSheetOpen(true);
  };

  // Lock Reveal State & 30s Countdown
  const [revealedLock, setRevealedLock] = useState<{
    lock_type: string;
    lock_value: string;
  } | null>(null);
  const [lockTimerSeconds, setLockTimerSeconds] = useState(0);
  const lockTimerRef = useRef<NodeJS.Timeout | null>(null);

  // New Note State
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newNoteIsInternal, setNewNoteIsInternal] = useState(true);

  useEffect(() => {
    return () => {
      if (lockTimerRef.current) clearInterval(lockTimerRef.current);
    };
  }, []);

  const handleRevealLock = async () => {
    if (!jobId) return;

    if (revealedLock) {
      // Hide lock early
      if (lockTimerRef.current) clearInterval(lockTimerRef.current);
      setRevealedLock(null);
      setLockTimerSeconds(0);
      return;
    }

    try {
      const res = await revealLockMutation.mutateAsync(jobId);
      setRevealedLock(res);
      setLockTimerSeconds(30);

      if (lockTimerRef.current) clearInterval(lockTimerRef.current);
      lockTimerRef.current = setInterval(() => {
        setLockTimerSeconds((prev) => {
          if (prev <= 1) {
            if (lockTimerRef.current) clearInterval(lockTimerRef.current);
            setRevealedLock(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reveal lock";
      toast.error(msg);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobId || !newNoteContent.trim()) return;

    try {
      await addNoteMutation.mutateAsync({
        jobId,
        content: newNoteContent.trim(),
        isInternal: newNoteIsInternal,
      });
      setNewNoteContent("");
      toast.success("Note added");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to add note";
      toast.error(msg);
    }
  };

  const handleAddPhoto = async (blob: Blob, kind: string, caption?: string) => {
    if (!jobId) return;
    try {
      await uploadJobPhotoDirect(jobId, { blob, kind, caption });
      toast.success("Photo uploaded");
      await refetchJob();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to upload photo";
      toast.error(msg);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!jobId) return;
    try {
      await deletePhotoMutation.mutateAsync({ jobId, photoId });
      toast.success("Photo deleted");
      await refetchJob();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete photo";
      toast.error(msg);
    }
  };

  if (isLoadingJob) {
    return (
      <div className="flex-1 p-4 space-y-4">
        <Skeleton className="h-10 w-32 rounded-xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-36 w-full rounded-2xl" />
        <Skeleton className="h-36 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !job) {
    return (
      <div className="flex-1 p-8 text-center space-y-4">
        <AlertCircle className="w-12 h-12 mx-auto text-rose-500" />
        <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
          Job Sheet Not Found
        </h2>
        <p className="text-xs text-neutral-500 max-w-xs mx-auto">
          The requested repair job could not be found or you may not have permission to view it.
        </p>
        <Link href="/jobs/">
          <Button size="sm" variant="outline" className="rounded-xl mt-2">
            Back to Jobs
          </Button>
        </Link>
      </div>
    );
  }

  const isTerminal = ["delivered", "cancelled", "returned_unrepaired"].includes(job.status);
  const cleanPhone = job.customer.phone.replace(/[^0-9+]/g, "");
  const telUrl = !job.customer.phone_masked && cleanPhone ? `tel:${cleanPhone}` : null;
  const whatsappUrl =
    !job.customer.phone_masked && cleanPhone
      ? `https://wa.me/${cleanPhone.replace("+", "")}`
      : null;

  return (
    <div className="flex-1 flex flex-col px-4 pt-3 pb-28 relative">
      {/* 1. Header Navigation & Job Number */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <button
          type="button"
          onClick={() => router.push("/jobs/")}
          className="flex items-center gap-1 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>{t("detail.backToJobs")}</span>
        </button>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsShareSheetOpen(true)}
            className="rounded-xl h-8 px-2.5 text-xs font-semibold gap-1.5 border-neutral-300 dark:border-neutral-700"
            title="Print"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsShareSheetOpen(true)}
            className="rounded-xl h-8 px-2.5 text-xs font-semibold gap-1.5 border-neutral-300 dark:border-neutral-700"
            title={tShare("share")}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{tShare("share")}</span>
          </Button>

          {job.priority === "urgent" && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
              {t("detail.priority.urgent")}
            </span>
          )}
          <StatusBadge status={job.status} size="md" />
        </div>
      </div>

      {/* Main Job Heading Card */}
      <div className="rounded-2xl border border-neutral-200/90 dark:border-border bg-white dark:bg-card p-4 shadow-sm mb-3">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-neutral-950 dark:text-neutral-50 tracking-tight">
              #{job.job_no}
            </h1>
            <p className="text-xs text-neutral-500 mt-0.5 font-medium">
              {job.device.brand_name} {job.device.model}
            </p>
          </div>

          <div className="text-right">
            {canSeeMoney && job.estimate_paise > 0 && (
              <p className="text-lg font-bold text-neutral-950 dark:text-neutral-50 tabular-nums">
                {formatPaise(job.estimate_paise)}
              </p>
            )}
            <p className="text-[11px] text-neutral-400">
              {formatDate(job.created_at, locale)}
            </p>
          </div>
        </div>

        {job.is_locked && (
          <div className="mt-3 flex items-center gap-1.5 p-2 rounded-xl bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs font-medium">
            <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Job order is locked after delivery.</span>
          </div>
        )}
      </div>

      {/* 2. Customer Section */}
      <div className="rounded-2xl border border-neutral-200/90 dark:border-border bg-white dark:bg-card p-4 shadow-sm mb-3 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-sky-500" />
            <span>{t("detail.customerTitle")}</span>
          </h2>
          <Link
            href={`/customers/detail/?id=${job.customer.id}`}
            className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline"
          >
            Profile
          </Link>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div>
            <p className="text-sm font-semibold text-neutral-950 dark:text-neutral-50">
              {job.customer.name}
            </p>
            <p className="text-xs text-neutral-500 font-mono mt-0.5">
              {job.customer.phone}
            </p>
          </div>

          {!job.customer.phone_masked && (
            <div className="flex items-center gap-1.5">
              {telUrl && (
                <a
                  href={telUrl}
                  className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center hover:bg-neutral-200 transition-colors"
                  aria-label="Call customer"
                >
                  <Phone className="w-4 h-4" />
                </a>
              )}
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center hover:bg-emerald-500/20 transition-colors"
                  aria-label="WhatsApp customer"
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. Device & Identifiers Section */}
      <div className="rounded-2xl border border-neutral-200/90 dark:border-border bg-white dark:bg-card p-4 shadow-sm mb-3 space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
          <Smartphone className="w-3.5 h-3.5 text-sky-500" />
          <span>{t("detail.deviceTitle")}</span>
        </h2>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-neutral-400">Brand / Model:</span>
            <p className="font-semibold text-neutral-900 dark:text-neutral-100">
              {job.device.brand_name} {job.device.model}
            </p>
          </div>
          <div>
            <span className="text-neutral-400">Category:</span>
            <p className="font-semibold text-neutral-900 dark:text-neutral-100 capitalize">
              {job.device.category}
            </p>
          </div>
          {job.device.color && (
            <div>
              <span className="text-neutral-400">Color:</span>
              <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                {job.device.color}
              </p>
            </div>
          )}
        </div>

        {/* Identifiers List (IMEI with formatting) */}
        {job.device.identifiers && job.device.identifiers.length > 0 && (
          <div className="space-y-1.5 pt-1 border-t border-neutral-100 dark:border-neutral-800">
            {job.device.identifiers.map((ident, idx) => {
              const isImei = ident.type.startsWith("imei");
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 text-xs font-mono"
                >
                  <span className="text-[10px] uppercase font-bold text-neutral-400">
                    {ident.type}:
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-900 dark:text-neutral-100">
                      {isImei ? formatIMEI(ident.value) : ident.value}
                    </span>
                    {ident.is_valid_luhn === true && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    )}
                    {isImei && (
                      <button
                        type="button"
                        onClick={() => {
                          setCheckImeiTarget(ident.value);
                          setCheckImeiOpen(true);
                        }}
                        className="ml-1 px-2 py-0.5 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 hover:bg-sky-100 text-[10px] font-sans font-semibold transition-colors flex items-center gap-1"
                      >
                        <ShieldCheck className="w-3 h-3" />
                        <span>{tDevices("checkImei.title")}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Problem & Physical Condition */}
      <div className="rounded-2xl border border-neutral-200/90 dark:border-border bg-white dark:bg-card p-4 shadow-sm mb-3 space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
          <Wrench className="w-3.5 h-3.5 text-sky-500" />
          <span>{t("detail.problemTitle")}</span>
        </h2>

        <div>
          <span className="text-[11px] text-neutral-400">Reported Problem:</span>
          <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100 whitespace-pre-wrap mt-0.5">
            {job.fault_description}
          </p>
        </div>

        {job.device_condition && (
          <div>
            <span className="text-[11px] text-neutral-400">Physical Condition:</span>
            <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100 mt-0.5">
              {job.device_condition}
            </p>
          </div>
        )}

        {job.condition_tags && job.condition_tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {job.condition_tags.map((tag, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-[11px]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Photos Strip */}
        <div className="pt-2">
          <PhotoStrip
            photos={job.photos || []}
            canEdit={!job.is_locked}
            onAddPhoto={handleAddPhoto}
            onDeletePhoto={handleDeletePhoto}
          />
        </div>
      </div>

      {/* 5. Device Lock Card */}
      {job.lock_type !== "none" && (
        <div className="rounded-2xl border border-neutral-200/90 dark:border-border bg-white dark:bg-card p-4 shadow-sm mb-3 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-sky-500" />
              <span>{t("detail.lockTitle")}</span>
            </h2>
            <Badge variant="outline" className="text-[10px] capitalize">
              {job.lock_type}
            </Badge>
          </div>

          {canViewLock ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRevealLock}
                  disabled={revealLockMutation.isPending}
                  className="rounded-xl text-xs gap-1.5 h-8"
                >
                  {revealLockMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : revealedLock ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                  <span>{revealedLock ? t("detail.hideLock") : t("detail.showLock")}</span>
                </Button>

                {revealedLock && lockTimerSeconds > 0 && (
                  <span className="text-[11px] font-mono font-medium text-amber-600 dark:text-amber-400">
                    {t("detail.lockTimer", { seconds: lockTimerSeconds })}
                  </span>
                )}
              </div>

              {revealedLock && (
                <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800 animate-in fade-in">
                  {revealedLock.lock_type === "pattern" ? (
                    <div className="flex flex-col items-center">
                      <PatternInput
                        value={revealedLock.lock_value}
                        onChange={() => {}}
                        disabled={true}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-2">
                      <span className="font-mono text-base font-bold tracking-widest text-neutral-900 dark:text-neutral-100">
                        {revealedLock.lock_value}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-neutral-400 italic">
              Lock details protected by permissions.
            </p>
          )}
        </div>
      )}

      {/* 6. Accessories Card */}
      <div className="rounded-2xl border border-neutral-200/90 dark:border-border bg-white dark:bg-card p-4 shadow-sm mb-3 space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
          {t("detail.accessoriesTitle")}
        </h2>
        {job.accessories && job.accessories.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {job.accessories.map((acc) => (
              <span
                key={acc.id}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-medium"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>{acc.name}</span>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-neutral-400 italic">{t("detail.noAccessories")}</p>
        )}
      </div>

      {/* 7. Repair Details & Payments Card */}
      <div className="mb-3">
        <RepairDetailsSection
          job={job}
          canEdit={canEdit}
          onOpenAddLineItem={handleOpenAddLineItem}
          onEditLineItem={handleEditLineItem}
          onOpenPayment={() => handleOpenPayment("cash", false)}
          onOpenUpiQr={() => setIsUpiQrOpen(true)}
          shopUpiId={currentShop?.upi_id}
        />
      </div>

      {/* 8. Assigned Technician Card */}
      <div className="rounded-2xl border border-neutral-200/90 dark:border-border bg-white dark:bg-card p-4 shadow-sm mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
            {t("detail.assignedToTitle")}
          </h2>
          <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 mt-1">
            {job.assigned_to ? job.assigned_to.display_name : t("list.unassigned")}
          </p>
        </div>

        {canAssign && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsAssignSheetOpen(true)}
            className="rounded-xl text-xs h-8"
          >
            {t("detail.changeAssignee")}
          </Button>
        )}
      </div>

      {/* 8. Status History Timeline */}
      <div className="rounded-2xl border border-neutral-200/90 dark:border-border bg-white dark:bg-card p-4 shadow-sm mb-3 space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-sky-500" />
          <span>{t("detail.timelineTitle")}</span>
        </h2>

        {isLoadingHistory ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        ) : history.length === 0 ? (
          <p className="text-xs text-neutral-400 italic">No transition history available</p>
        ) : (
          <div className="space-y-3 pl-2 border-l-2 border-neutral-100 dark:border-neutral-800 ml-1">
            {history.map((hist) => (
              <div key={hist.id} className="relative pl-3 text-xs space-y-0.5">
                <span className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-neutral-300 dark:bg-neutral-700 border-2 border-white dark:border-card" />
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100 capitalize">
                    {t(`status.${hist.to_status}`)}
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    {formatDateTime(hist.created_at, locale)}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500">By {hist.changed_by_name}</p>
                {hist.note && (
                  <p className="text-[11px] text-neutral-600 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-900 p-2 rounded-lg mt-1">
                    {hist.note}
                  </p>
                )}
                {hist.cancel_reason && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-lg mt-1">
                    Reason: {hist.cancel_reason}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 9. Notes Section */}
      <div className="rounded-2xl border border-neutral-200/90 dark:border-border bg-white dark:bg-card p-4 shadow-sm mb-3 space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
          {t("detail.notesTitle")}
        </h2>

        {isLoadingNotes ? (
          <Skeleton className="h-12 w-full rounded-xl" />
        ) : notes.length === 0 ? (
          <p className="text-xs text-neutral-400 italic">{t("detail.noNotes")}</p>
        ) : (
          <div className="space-y-2">
            {notes.map((note) => (
              <div
                key={note.id}
                className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                    {note.author_name}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-medium">
                      {note.is_internal ? t("detail.internalOnly") : t("detail.customerVisible")}
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      {formatDate(note.created_at, locale)}
                    </span>
                  </div>
                </div>
                <p className="text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap">
                  {note.content}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Add Note Input */}
        <form onSubmit={handleAddNote} className="space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
          <Input
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            placeholder={t("detail.addNotePlaceholder")}
            className="rounded-xl text-xs h-9"
          />
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setNewNoteIsInternal(!newNoteIsInternal)}
              className="text-[11px] text-neutral-500 flex items-center gap-1 hover:text-neutral-800 dark:hover:text-neutral-200"
            >
              <span className={`w-2 h-2 rounded-full ${newNoteIsInternal ? "bg-amber-500" : "bg-emerald-500"}`} />
              <span>{newNoteIsInternal ? t("detail.internalOnly") : t("detail.customerVisible")}</span>
            </button>
            <Button
              type="submit"
              size="sm"
              disabled={addNoteMutation.isPending || !newNoteContent.trim()}
              className="rounded-xl text-xs h-8 gap-1"
            >
              <Send className="w-3 h-3" />
              <span>{t("detail.addNoteBtn")}</span>
            </Button>
          </div>
        </form>
      </div>

      {/* 10. Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-background/95 backdrop-blur-md border-t border-neutral-200/90 dark:border-border p-3 flex items-center justify-between gap-2 max-w-lg mx-auto">
        <Button
          type="button"
          disabled={job.is_locked}
          onClick={() => setIsStatusSheetOpen(true)}
          className="flex-1 rounded-xl h-11 font-bold text-xs bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 shadow-md"
        >
          {t("detail.updateStatusBtn")}
        </Button>

        {canRecordPayment && (
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenPayment("cash", false)}
            className="rounded-xl h-11 text-xs font-semibold px-3 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
          >
            <CreditCard className="w-3.5 h-3.5 mr-1" />
            <span>{tBilling("payment.actionBtn")}</span>
          </Button>
        )}

        {canViewInvoices && jobInvoice ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/invoices/detail/?id=${jobInvoice.id}`)}
            className="rounded-xl h-11 text-xs font-semibold px-2.5 flex items-center gap-1.5 border-neutral-300"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{tInvoices("viewInvoice")}</span>
            <Badge
              variant="secondary"
              className={`text-[9px] px-1 py-0 uppercase font-bold tracking-wider ${
                jobInvoice.status === "issued"
                  ? "bg-emerald-100 text-emerald-800"
                  : jobInvoice.status === "draft"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-rose-100 text-rose-800"
              }`}
            >
              {jobInvoice.status}
            </Badge>
          </Button>
        ) : canCreateDraft && !jobInvoice ? (
          <Button
            type="button"
            variant="outline"
            disabled={createInvoiceMutation.isPending || job.is_locked}
            onClick={handleCreateInvoice}
            className="rounded-xl h-11 text-xs font-semibold px-2.5 flex items-center gap-1 border-neutral-300"
          >
            {createInvoiceMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileText className="w-3.5 h-3.5" />
            )}
            <span>{tInvoices("createInvoice")}</span>
          </Button>
        ) : null}

        {canEdit && !job.is_locked && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsEditSheetOpen(true)}
            className="rounded-xl h-11 text-xs font-semibold px-4"
          >
            <Edit className="w-3.5 h-3.5 mr-1" />
            <span>{t("detail.editJobBtn")}</span>
          </Button>
        )}

        {isTerminal && canReopen && !job.is_locked && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsReopenDialogOpen(true)}
            className="rounded-xl h-11 text-xs font-semibold px-3"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            <span>{t("detail.reopenJobBtn")}</span>
          </Button>
        )}
      </div>

      {/* Modals & Sheets */}
      <AssignTechnicianSheet
        job={job}
        open={isAssignSheetOpen}
        onOpenChange={setIsAssignSheetOpen}
      />

      <StatusChangeSheet
        job={job}
        open={isStatusSheetOpen}
        onOpenChange={setIsStatusSheetOpen}
        onJobRefresh={refetchJob}
        onOpenPayment={() => handleOpenPayment("cash", false)}
      />

      <ReopenJobDialog
        job={job}
        open={isReopenDialogOpen}
        onOpenChange={setIsReopenDialogOpen}
      />

      <EditJobSheet
        job={job}
        open={isEditSheetOpen}
        onOpenChange={setIsEditSheetOpen}
        onJobRefresh={refetchJob}
      />

      <JobShareSheet
        job={job}
        open={isShareSheetOpen}
        onOpenChange={setIsShareSheetOpen}
        shopName={currentShop?.name}
      />

      <CheckImeiSheet
        open={checkImeiOpen}
        onOpenChange={setCheckImeiOpen}
        defaultImei={checkImeiTarget}
      />

      <LineItemSheet
        jobId={job.id}
        open={isLineItemSheetOpen}
        onOpenChange={setIsLineItemSheetOpen}
        itemToEdit={lineItemToEdit}
      />

      <PaymentSheet
        jobId={job.id}
        jobNo={job.job_no}
        device={job.device}
        balancePaise={
          job.balance_paise ??
          Math.max(
            0,
            (job.total_paise && job.total_paise > 0
              ? job.total_paise
              : job.estimate_paise) - (job.paid_paise || 0)
          )
        }
        open={isPaymentSheetOpen}
        onOpenChange={setIsPaymentSheetOpen}
        defaultMode={paymentDefaultMode}
        focusReference={focusPaymentReference}
      />

      {Boolean(currentShop?.upi_id) && (
        <UpiQrModal
          open={isUpiQrOpen}
          onOpenChange={setIsUpiQrOpen}
          shopName={currentShop?.name || "Repair Shop"}
          upiId={currentShop?.upi_id || ""}
          amountPaise={
            job.balance_paise ??
            Math.max(
              0,
              (job.total_paise && job.total_paise > 0
                ? job.total_paise
                : job.estimate_paise) - (job.paid_paise || 0)
            )
          }
          jobNo={job.job_no}
          onMarkAsPaid={() => handleOpenPayment("upi", true)}
        />
      )}
    </div>
  );
}

export default function JobDetailPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex-1 p-4 space-y-4">
          <Skeleton className="h-10 w-32 rounded-xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-36 w-full rounded-2xl" />
        </div>
      }
    >
      <JobDetailContent />
    </React.Suspense>
  );
}

