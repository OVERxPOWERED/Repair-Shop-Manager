"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Loader2,
  AlertCircle,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useIntakeStore } from "@/features/jobs/intake-store";
import {
  customerStepSchema,
  deviceStepSchema,
  conditionStepSchema,
  accessoriesStepSchema,
  problemStepSchema,
  estimateStepSchema,
  assignmentStepSchema,
} from "@/features/jobs/intake-schema";
import { useCreateJob, uploadJobPhotoDirect, JobCreatePayload } from "@/features/jobs/api";
import { IntakeStepCustomer } from "@/features/jobs/components/IntakeStepCustomer";
import { IntakeStepDevice } from "@/features/jobs/components/IntakeStepDevice";
import { IntakeStepCondition } from "@/features/jobs/components/IntakeStepCondition";
import { IntakeStepAccessories } from "@/features/jobs/components/IntakeStepAccessories";
import { IntakeStepProblem } from "@/features/jobs/components/IntakeStepProblem";
import { IntakeStepEstimate } from "@/features/jobs/components/IntakeStepEstimate";
import { IntakeStepAssignment } from "@/features/jobs/components/IntakeStepAssignment";
import { IntakeStepConfirmation } from "@/features/jobs/components/IntakeStepConfirmation";

const TOTAL_STEPS = 8;
const SKIPPABLE_STEPS = [2, 3, 5, 6]; // Condition, Accessories, Estimate, Assignment

export default function NewJobPage() {
  const t = useTranslations("intake");
  const router = useRouter();

  const draft = useIntakeStore((s) => s.draft);
  const setStep = useIntakeStore((s) => s.setStep);
  const clearDraft = useIntakeStore((s) => s.clearDraft);
  const isDraftRestored = useIntakeStore((s) => s.isDraftRestored);
  const dismissRestoredBanner = useIntakeStore((s) => s.dismissRestoredBanner);

  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoUploadProgress, setPhotoUploadProgress] = useState<string | null>(null);

  const createJobMutation = useCreateJob();

  const currentStep = draft.step;

  const validateCurrentStep = (): boolean => {
    setStepErrors({});
    let result: { success: boolean; error?: any };

    switch (currentStep) {
      case 0:
        result = customerStepSchema.safeParse(draft.customer);
        break;
      case 1:
        result = deviceStepSchema.safeParse(draft.device);
        break;
      case 2:
        result = conditionStepSchema.safeParse({
          conditionTags: draft.conditionTags,
          deviceCondition: draft.deviceCondition,
        });
        break;
      case 3:
        result = accessoriesStepSchema.safeParse({
          accessories: draft.accessories,
        });
        break;
      case 4:
        result = problemStepSchema.safeParse({
          faultDescription: draft.faultDescription,
          lockType: draft.lockType,
          lockValue: draft.lockValue,
          internalNote: draft.internalNote,
        });
        break;
      case 5:
        result = estimateStepSchema.safeParse({
          estimatePaise: draft.estimatePaise,
          expectedDate: draft.expectedDate,
          advancePaise: draft.advancePaise,
          advanceMode: draft.advanceMode,
        });
        break;
      case 6:
        result = assignmentStepSchema.safeParse({
          assignedToId: draft.assignedToId,
          priority: draft.priority,
        });
        break;
      default:
        result = { success: true };
    }

    if (!result.success) {
      const errMap: Record<string, string> = {};
      result.error.errors.forEach((err: any) => {
        const field = err.path.join(".");
        const key = err.message.replace(/^errors\.intake\./, "errors.");
        try {
          errMap[field] = t(key as any);
        } catch {
          errMap[field] = err.message;
        }
      });
      setStepErrors(errMap);
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSkip = () => {
    setStepErrors({});
    setStep(currentStep + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack = () => {
    setStepErrors({});
    if (currentStep > 0) {
      setStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      router.back();
    }
  };

  const handleSubmit = async () => {
    // Validate final full payload
    const isCustomerValid = customerStepSchema.safeParse(draft.customer).success;
    const isDeviceValid = deviceStepSchema.safeParse(draft.device).success;
    const isProblemValid = problemStepSchema.safeParse({
      faultDescription: draft.faultDescription,
      lockType: draft.lockType,
      lockValue: draft.lockValue,
      internalNote: draft.internalNote,
    }).success;

    if (!isCustomerValid || !isDeviceValid || !isProblemValid) {
      toast.error(t("incompleteRequiredFields"));
      if (!isCustomerValid) setStep(0);
      else if (!isDeviceValid) setStep(1);
      else if (!isProblemValid) setStep(4);
      return;
    }

    setIsSubmitting(true);
    setPhotoUploadProgress(null);

    try {
      const payload: JobCreatePayload = {
        fault_description: draft.faultDescription.trim(),
        condition_tags: draft.conditionTags || [],
        device_condition: draft.deviceCondition || "",
        accessories: draft.accessories || [],
        lock_type: draft.lockType,
        lock_value: draft.lockValue || "",
        estimate_paise: draft.estimatePaise || 0,
        advance_paise: draft.advancePaise > 0 ? draft.advancePaise : undefined,
        advance_mode: draft.advancePaise > 0 ? draft.advanceMode : undefined,
        advance_reference: draft.advancePaise > 0 ? draft.advanceReference?.trim() : undefined,
        expected_date: draft.expectedDate || null,
        assigned_to_id: draft.assignedToId || null,
        internal_note: draft.internalNote || "",
        priority: draft.priority || "normal",
        kind: "full",
      };

      if (draft.customer.id) {
        payload.customer_id = draft.customer.id;
      } else {
        payload.new_customer = {
          name: draft.customer.name.trim(),
          phone: draft.customer.phone.trim(),
        };
      }

      if (draft.device.id) {
        payload.device_id = draft.device.id;
      } else {
        payload.new_device = {
          category: draft.device.category,
          brand_id: draft.device.brandId || undefined,
          brand_text: !draft.device.brandId ? draft.device.brandText : undefined,
          model: draft.device.model.trim(),
          color: draft.device.color?.trim() || undefined,
          identifiers: (draft.device.identifiers || []).map((i) => ({
            type: i.type,
            value: i.value,
            captured_via: i.capturedVia || "manual",
            confirm_invalid: i.confirmInvalid ?? false,
          })),
        };
      }

      // Submit job creation with exact draft idempotency key
      const createdJob = await createJobMutation.mutateAsync({
        body: payload,
        idempotencyKey: draft.idempotencyKey,
      });

      // Sequential photo uploads if blobs exist
      const photosToUpload = (draft.photos || []).filter((p) => p.blob);
      if (photosToUpload.length > 0) {
        setPhotoUploadProgress(t("uploadingPhotosProgress", { count: photosToUpload.length }));
        let uploadFailures = 0;

        for (let i = 0; i < photosToUpload.length; i++) {
          const photo = photosToUpload[i];
          try {
            if (photo.blob) {
              await uploadJobPhotoDirect(createdJob.id, {
                blob: photo.blob,
                kind: photo.kind,
                caption: photo.caption,
              });
            }
          } catch {
            uploadFailures++;
          }
        }

        if (uploadFailures > 0) {
          toast.warning(t("photoUploadPartialWarning", { failed: uploadFailures }));
        }
      }

      toast.success(t("jobCreatedSuccess", { jobNo: createdJob.job_no }));
      clearDraft();
      router.push(`/jobs/detail/?id=${createdJob.id}`);
    } catch (err: any) {
      toast.error(err?.message || t("jobCreateFailed"));
    } finally {
      setIsSubmitting(false);
      setPhotoUploadProgress(null);
    }
  };

  const stepTitles = [
    t("steps.customer"),
    t("steps.device"),
    t("steps.condition"),
    t("steps.accessories"),
    t("steps.problem"),
    t("steps.estimate"),
    t("steps.assignment"),
    t("steps.confirmation"),
  ];

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-white dark:bg-neutral-950 pb-28">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBack}
              className="w-9 h-9 rounded-full flex items-center justify-center text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base font-bold text-neutral-900 dark:text-neutral-100 leading-tight">
                {t("newJobSheetTitle")}
              </h1>
              <p className="text-[11px] text-neutral-500 font-medium">
                {t("stepIndicator", { step: currentStep + 1, total: TOTAL_STEPS })}:{" "}
                <span className="text-neutral-800 dark:text-neutral-200 font-semibold">
                  {stepTitles[currentStep]}
                </span>
              </p>
            </div>
          </div>

          {/* Reset / Discard Action */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearDraft}
            className="h-8 px-2.5 text-xs text-neutral-400 hover:text-red-500 font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            {t("reset")}
          </Button>
        </div>

        {/* 8-segment Progress Line */}
        <div className="grid grid-cols-8 gap-1 mt-3">
          {Array.from({ length: TOTAL_STEPS }).map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx < currentStep
                  ? "bg-sky-500"
                  : idx === currentStep
                  ? "bg-sky-500 ring-2 ring-sky-500/20"
                  : "bg-neutral-100 dark:bg-neutral-800"
              }`}
            />
          ))}
        </div>
      </header>

      {/* Restored Draft Banner */}
      {isDraftRestored && (
        <div className="mx-4 mt-3 p-3 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-2xl flex items-center justify-between text-xs text-sky-900 dark:text-sky-200 animate-in fade-in duration-300">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sky-600 shrink-0" />
            <span>{t("draftRestoredNotice")}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={clearDraft}
              className="text-xs font-semibold text-red-600 dark:text-red-400 underline hover:no-underline"
            >
              {t("discardDraft")}
            </button>
            <button
              type="button"
              onClick={dismissRestoredBanner}
              className="w-5 h-5 rounded-full hover:bg-sky-100 dark:hover:bg-sky-900 flex items-center justify-center text-sky-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Step Content Container */}
      <main className="flex-1 px-4 pt-5 max-w-lg mx-auto w-full">
        {currentStep === 0 && <IntakeStepCustomer errors={stepErrors} />}
        {currentStep === 1 && <IntakeStepDevice errors={stepErrors} />}
        {currentStep === 2 && <IntakeStepCondition />}
        {currentStep === 3 && <IntakeStepAccessories />}
        {currentStep === 4 && <IntakeStepProblem errors={stepErrors} />}
        {currentStep === 5 && <IntakeStepEstimate errors={stepErrors} />}
        {currentStep === 6 && <IntakeStepAssignment />}
        {currentStep === 7 && <IntakeStepConfirmation />}
      </main>

      {/* Sticky Bottom Actions Bar */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md border-t border-neutral-200 dark:border-neutral-800 p-4 safe-area-bottom">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          {currentStep > 0 && currentStep < TOTAL_STEPS - 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              className="h-13 px-5 rounded-2xl text-sm font-semibold border-neutral-200 dark:border-neutral-800"
            >
              {t("back")}
            </Button>
          )}

          {SKIPPABLE_STEPS.includes(currentStep) && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleSkip}
              className="h-13 px-4 rounded-2xl text-sm font-medium text-neutral-500 hover:text-neutral-800"
            >
              {t("skip")}
            </Button>
          )}

          {currentStep < TOTAL_STEPS - 1 ? (
            <Button
              type="button"
              onClick={handleNext}
              className="flex-1 h-13 rounded-2xl text-sm font-bold bg-sky-500 hover:bg-sky-600 text-white shadow-lg shadow-sky-500/20 active:scale-[0.98] transition-all"
            >
              {t("next")}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="flex-1 h-13 rounded-2xl text-sm font-bold bg-sky-500 hover:bg-sky-600 text-white shadow-lg shadow-sky-500/25 active:scale-[0.98] transition-all"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{photoUploadProgress || t("creatingJobSheet")}</span>
                </div>
              ) : (
                <span>{t("createJobSheetSubmit")}</span>
              )}
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
