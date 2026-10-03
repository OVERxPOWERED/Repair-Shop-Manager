"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { hapticTick } from "@/native/haptics";
import { useReopenJob, type Job } from "../api";

export interface ReopenJobDialogProps {
  job: Job;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReopenJobDialog({
  job,
  open,
  onOpenChange,
}: ReopenJobDialogProps) {
  const t = useTranslations("jobs");
  const reopenMutation = useReopenJob();
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const handleReopen = async () => {
    if (!reason.trim()) {
      setError("Please provide a reason for reopening this repair job.");
      return;
    }

    try {
      await hapticTick();
      await reopenMutation.mutateAsync({
        jobId: job.id,
        reason: reason.trim(),
      });
      toast.success(t("detail.reopenedSuccess", { jobNo: job.job_no }));
      onOpenChange(false);
      setReason("");
      setError("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reopen job";
      toast.error(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-sky-500" />
            <span>{t("detail.reopenDialogTitle")}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-neutral-500">
            Reopening will change the job status back to &quot;In Repair&quot; and clear any warranty expiration.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label className="text-xs font-semibold">
            {t("detail.reopenReasonPlaceholder")}
          </Label>
          <Textarea
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (e.target.value.trim()) setError("");
            }}
            placeholder="e.g. Customer reported device won't charge again"
            rows={3}
            className="rounded-xl text-xs"
          />
          {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl h-10 text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={reopenMutation.isPending}
            onClick={handleReopen}
            className="rounded-xl h-10 text-xs font-bold bg-neutral-950 text-white dark:bg-white dark:text-neutral-950"
          >
            {reopenMutation.isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                <span>{t("detail.reopening")}</span>
              </>
            ) : (
              <span>{t("detail.reopenSubmit")}</span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
