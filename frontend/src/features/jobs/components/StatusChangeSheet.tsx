"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, ArrowRight, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { hapticTick } from "@/native/haptics";
import { StatusBadge } from "./StatusBadge";
import { STATUS_STYLE, type JobStatus } from "../status";
import { useChangeJobStatus, useJobTransitions, type Job } from "../api";
import { ApiError } from "@/lib/api/client";

export interface StatusChangeSheetProps {
  job: Job;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJobRefresh?: () => void;
}

export function StatusChangeSheet({
  job,
  open,
  onOpenChange,
  onJobRefresh,
}: StatusChangeSheetProps) {
  const t = useTranslations("jobs");
  const { data: transitionsData, isLoading: isLoadingTransitions } = useJobTransitions(
    open ? job.id : null
  );
  const changeStatusMutation = useChangeJobStatus();

  const [selectedTarget, setSelectedTarget] = useState<JobStatus | null>(null);
  const [note, setNote] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [cancelReasonError, setCancelReasonError] = useState("");

  const allowedTransitions = transitionsData?.allowed ?? [];

  const handleSelectTransition = (target: JobStatus) => {
    setSelectedTarget(target);
    setCancelReasonError("");
  };

  const handleConfirm = async () => {
    if (!selectedTarget) return;

    if (selectedTarget === "cancelled" && !cancelReason.trim()) {
      setCancelReasonError(t("detail.cancelReasonPrompt"));
      return;
    }

    try {
      await hapticTick();
      await changeStatusMutation.mutateAsync({
        jobId: job.id,
        toStatus: selectedTarget,
        note: note.trim() || undefined,
        cancelReason: selectedTarget === "cancelled" ? cancelReason.trim() : undefined,
        expectedVersion: job.version,
      });

      toast.success(t("detail.title", { jobNo: job.job_no }) + " status updated");
      onOpenChange(false);
      setSelectedTarget(null);
      setNote("");
      setCancelReason("");
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error(t("detail.conflictWarning"));
        onOpenChange(false);
        onJobRefresh?.();
        return;
      }
      const msg = err instanceof Error ? err.message : "Failed to change status";
      toast.error(msg);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto p-6 space-y-4">
        <SheetHeader>
          <SheetTitle className="text-base font-bold flex items-center justify-between">
            <span>{t("detail.statusSheetTitle")}</span>
            <StatusBadge status={job.status} />
          </SheetTitle>
        </SheetHeader>

        {isLoadingTransitions ? (
          <div className="py-8 flex items-center justify-center text-neutral-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            <span className="text-xs">Checking allowed transitions...</span>
          </div>
        ) : allowedTransitions.length === 0 ? (
          <div className="py-6 text-center text-xs text-neutral-500">
            No further status transitions available from current state.
          </div>
        ) : !selectedTarget ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-neutral-500 mb-2">
              {t("detail.statusChangePrompt")}
            </p>
            <div className="grid grid-cols-1 gap-2">
              {allowedTransitions.map((target) => {
                const style = STATUS_STYLE[target];
                return (
                  <button
                    key={target}
                    type="button"
                    onClick={() => handleSelectTransition(target)}
                    className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-neutral-200/90 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-white dark:bg-card transition-all active:scale-[0.99] text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
                      <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 capitalize">
                        {t(`status.${target}`)}
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-neutral-400" />
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-100 dark:bg-neutral-900">
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-500">Moving to:</span>
                <StatusBadge status={selectedTarget} />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTarget(null)}
                className="h-7 text-xs text-neutral-500"
              >
                Change
              </Button>
            </div>

            {selectedTarget === "cancelled" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-rose-600 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{t("detail.cancelReasonPrompt")}</span>
                </Label>
                <Textarea
                  value={cancelReason}
                  onChange={(e) => {
                    setCancelReason(e.target.value);
                    if (e.target.value.trim()) setCancelReasonError("");
                  }}
                  placeholder={t("detail.cancelReasonPlaceholder")}
                  rows={2}
                  className="rounded-xl text-xs"
                />
                {cancelReasonError && (
                  <p className="text-xs text-rose-500 font-medium">{cancelReasonError}</p>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                {t("detail.noteOptional")}
              </Label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add optional note for history..."
                className="rounded-xl text-xs"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedTarget(null)}
                className="flex-1 rounded-xl h-10 text-xs"
              >
                Back
              </Button>
              <Button
                type="button"
                disabled={changeStatusMutation.isPending}
                onClick={handleConfirm}
                className="flex-1 rounded-xl h-10 text-xs font-bold bg-neutral-950 text-white dark:bg-white dark:text-neutral-950"
              >
                {changeStatusMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    <span>{t("detail.changingStatus")}</span>
                  </>
                ) : (
                  <span>{t("detail.confirmTransition")}</span>
                )}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
