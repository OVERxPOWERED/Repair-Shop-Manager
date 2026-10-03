"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
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
import { paiseToRupeesInput, rupeesToPaise } from "@/lib/format/money";
import { useUpdateJob, type Job } from "../api";
import { ApiError } from "@/lib/api/client";

export interface EditJobSheetProps {
  job: Job;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJobRefresh?: () => void;
}

export function EditJobSheet({
  job,
  open,
  onOpenChange,
  onJobRefresh,
}: EditJobSheetProps) {
  const t = useTranslations("jobs");
  const updateMutation = useUpdateJob();

  const [fault, setFault] = useState(job.fault_description);
  const [condition, setCondition] = useState(job.device_condition || "");
  const [estimateRupees, setEstimateRupees] = useState(
    job.estimate_paise > 0 ? paiseToRupeesInput(job.estimate_paise) : ""
  );
  const [expectedDate, setExpectedDate] = useState(job.expected_date || "");

  useEffect(() => {
    if (open) {
      setFault(job.fault_description);
      setCondition(job.device_condition || "");
      setEstimateRupees(job.estimate_paise > 0 ? paiseToRupeesInput(job.estimate_paise) : "");
      setExpectedDate(job.expected_date || "");
    }
  }, [open, job]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fault.trim()) {
      toast.error("Problem description cannot be empty");
      return;
    }

    const paise = estimateRupees ? rupeesToPaise(estimateRupees) : 0;

    try {
      await updateMutation.mutateAsync({
        jobId: job.id,
        body: {
          fault_description: fault.trim(),
          device_condition: condition.trim() || undefined,
          estimate_paise: paise ?? 0,
          expected_date: expectedDate || null,
        },
        expectedVersion: job.version,
      });

      toast.success(t("detail.jobUpdatedSuccess"));
      onOpenChange(false);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error(t("detail.conflictWarning"));
        onOpenChange(false);
        onJobRefresh?.();
        return;
      }
      const msg = err instanceof Error ? err.message : "Failed to update job";
      toast.error(msg);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] overflow-y-auto p-6">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-base font-bold">
            {t("detail.editDialogTitle")}
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              {t("detail.problemTitle")} *
            </Label>
            <Textarea
              value={fault}
              onChange={(e) => setFault(e.target.value)}
              rows={3}
              className="rounded-xl text-xs"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              {t("detail.conditionTitle")}
            </Label>
            <Input
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              placeholder="e.g. Scratched back panel, minor dent on left corner"
              className="rounded-xl text-xs h-10"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                {t("detail.estimateAmount")}
              </Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={estimateRupees}
                onChange={(e) => setEstimateRupees(e.target.value)}
                placeholder="0.00"
                className="rounded-xl text-xs h-10 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                {t("detail.expectedDate")}
              </Label>
              <Input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                className="rounded-xl text-xs h-10"
              />
            </div>
          </div>

          <div className="pt-2 flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 rounded-xl h-10 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              className="flex-1 rounded-xl h-10 text-xs font-bold bg-neutral-950 text-white dark:bg-white dark:text-neutral-950"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  <span>{t("detail.saving")}</span>
                </>
              ) : (
                <span>{t("detail.saveChanges")}</span>
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
