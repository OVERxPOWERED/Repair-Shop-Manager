"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { User, Check, Loader2, UserMinus } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useAssignableStaff } from "@/features/staff/api";
import { useAssignJob, type Job } from "../api";

export interface AssignTechnicianSheetProps {
  job: Job;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssignTechnicianSheet({
  job,
  open,
  onOpenChange,
}: AssignTechnicianSheetProps) {
  const t = useTranslations("jobs");
  const { data: staffList = [], isLoading: isLoadingStaff } = useAssignableStaff();
  const assignMutation = useAssignJob();
  const [selectedMembershipId, setSelectedMembershipId] = useState<string | null>(
    job.assigned_to?.id || null
  );

  const handleAssign = async (membershipId: string | null) => {
    setSelectedMembershipId(membershipId);
    try {
      await assignMutation.mutateAsync({
        jobId: job.id,
        membershipId,
      });
      toast.success(t("detail.assignedSuccess"));
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to assign technician";
      toast.error(msg);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto p-6">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-base font-bold">
            {t("detail.assigneeSheetTitle")}
          </SheetTitle>
        </SheetHeader>

        {isLoadingStaff ? (
          <div className="py-8 flex items-center justify-center text-neutral-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            <span className="text-xs">Loading staff members...</span>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Unassign Option */}
            <button
              type="button"
              disabled={assignMutation.isPending}
              onClick={() => handleAssign(null)}
              className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-left transition-colors ${
                job.assigned_to === null
                  ? "border-neutral-950 bg-neutral-50 dark:bg-neutral-900 dark:border-white"
                  : "border-neutral-200/90 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500">
                  <UserMinus className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                    {t("detail.unassign")}
                  </p>
                  <p className="text-[11px] text-neutral-400">Leave job unassigned</p>
                </div>
              </div>
              {job.assigned_to === null && (
                <Check className="w-4 h-4 text-neutral-950 dark:text-white" />
              )}
            </button>

            {/* List of Staff Members */}
            {staffList.map((member) => {
              const isCurrent = job.assigned_to?.id === member.id;
              const isSelected = selectedMembershipId === member.id && assignMutation.isPending;

              return (
                <button
                  key={member.id}
                  type="button"
                  disabled={assignMutation.isPending}
                  onClick={() => handleAssign(member.id)}
                  className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-left transition-colors ${
                    isCurrent
                      ? "border-neutral-950 bg-neutral-50 dark:bg-neutral-900 dark:border-white"
                      : "border-neutral-200/90 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold text-xs uppercase">
                      {member.display_name.slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-neutral-950 dark:text-neutral-50">
                        {member.display_name}
                      </p>
                      <p className="text-[11px] text-neutral-400">{member.role_name}</p>
                    </div>
                  </div>

                  {isSelected ? (
                    <Loader2 className="w-4 h-4 animate-spin text-neutral-500" />
                  ) : isCurrent ? (
                    <Check className="w-4 h-4 text-neutral-950 dark:text-white" />
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
