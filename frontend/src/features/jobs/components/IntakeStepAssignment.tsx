"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { UserCheck, ShieldAlert, Clock, Flame, UserPlus } from "lucide-react";
import { useAssignableStaff } from "@/features/staff/api";
import { QuickShareCodeSheet } from "@/features/staff/QuickShareCodeSheet";
import { Button } from "@/components/ui/button";
import { useIntakeStore } from "../intake-store";

const PRIORITIES = [
  { id: "low", icon: Clock, color: "text-neutral-500" },
  { id: "normal", icon: ShieldAlert, color: "text-sky-500" },
  { id: "urgent", icon: Flame, color: "text-amber-500" },
] as const;

export function IntakeStepAssignment() {
  const t = useTranslations("intake");
  const tStaff = useTranslations("staff");
  const draft = useIntakeStore((s) => s.draft);
  const updateDraft = useIntakeStore((s) => s.updateDraft);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);

  const { data: staffList = [], isPending } = useAssignableStaff();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
          {t("stepAssignmentTitle")}
        </h2>
        <p className="text-xs text-neutral-500 mt-0.5">
          {t("stepAssignmentSubtitle")}
        </p>
      </div>

      {/* Priority Selection */}
      <div>
        <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-2">
          {t("priorityLevel")}
        </label>
        <div className="grid grid-cols-3 gap-2">
          {PRIORITIES.map((p) => {
            const isSelected = draft.priority === p.id;
            const Icon = p.icon;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => updateDraft({ priority: p.id })}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-semibold transition-all ${
                  isSelected
                    ? "border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-sky-900 dark:text-sky-100 shadow-sm"
                    : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50"
                }`}
              >
                <Icon className={`w-4 h-4 mb-1.5 ${p.color}`} />
                <span className="capitalize">{t(`priorities.${p.id}`)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Technician Assignment */}
      <div>
        <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-2">
          {t("assignTechnician")}
        </label>

        {isPending ? (
          <p className="text-xs text-neutral-400 py-2">{t("loadingStaff")}</p>
        ) : (
          <div className="space-y-2">
            {/* Unassigned Option */}
            <button
              type="button"
              onClick={() => updateDraft({ assignedToId: null })}
              className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                !draft.assignedToId
                  ? "border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-sky-900 dark:text-sky-100 shadow-sm"
                  : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300"
              }`}
            >
              <div>
                <p className="text-xs font-bold">{t("unassignedOption")}</p>
                <p className="text-[11px] text-neutral-500">{t("unassignedOptionHint")}</p>
              </div>
              {!draft.assignedToId && (
                <div className="w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center text-xs">
                  ✓
                </div>
              )}
            </button>

            {/* Staff list */}
            {staffList.map((member) => {
              const isSelected = draft.assignedToId === member.id;
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => updateDraft({ assignedToId: member.id })}
                  className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                    isSelected
                      ? "border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-sky-900 dark:text-sky-100 shadow-sm"
                      : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300 font-bold text-xs">
                      {member.display_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                        {member.display_name}
                      </p>
                      <p className="text-[11px] text-neutral-500 font-medium">
                        {member.role_name}
                      </p>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center text-xs">
                      ✓
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Quick Invite / Share Code Button */}
        <div className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShareSheetOpen(true)}
            className="w-full h-11 rounded-2xl border-dashed border-neutral-300 dark:border-neutral-700 text-xs font-semibold gap-2 text-neutral-600 dark:text-neutral-300 hover:text-primary hover:border-primary"
          >
            <UserPlus className="w-4 h-4" />
            <span>{tStaff("inviteTechnicianBtn")}</span>
          </Button>
        </div>

        <QuickShareCodeSheet open={shareSheetOpen} onOpenChange={setShareSheetOpen} />
      </div>
    </div>
  );
}
