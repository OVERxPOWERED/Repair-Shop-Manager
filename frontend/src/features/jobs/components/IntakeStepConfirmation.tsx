"use client";

import React from "react";
import { useTranslations } from "next-intl";
import {
  User,
  Smartphone,
  Activity,
  Layers,
  Wrench,
  DollarSign,
  UserCheck,
  Edit2,
  Lock,
  Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPaise } from "@/lib/format/money";
import { formatDate } from "@/lib/format/date";
import { useLocaleStore } from "@/i18n/store";
import { useAssignableStaff } from "@/features/staff/api";
import { useIntakeStore } from "../intake-store";

export function IntakeStepConfirmation() {
  const t = useTranslations("intake");
  const locale = useLocaleStore((s) => s.locale);
  const draft = useIntakeStore((s) => s.draft);
  const setStep = useIntakeStore((s) => s.setStep);

  const { data: staffList = [] } = useAssignableStaff();
  const assignedStaff = staffList.find((m) => m.id === draft.assignedToId);

  const primaryImei = draft.device.identifiers.find((i) => i.type === "imei1");

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
          {t("stepConfirmationTitle")}
        </h2>
        <p className="text-xs text-neutral-500 mt-0.5">
          {t("stepConfirmationSubtitle")}
        </p>
      </div>

      <div className="space-y-3">
        {/* Customer Summary */}
        <div className="p-3.5 bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 flex items-start justify-between">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-950 flex items-center justify-center text-sky-600 mt-0.5">
              <User className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-500">{t("customer")}</p>
              <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                {draft.customer.name}
              </p>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 font-mono">
                {draft.customer.phone}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setStep(0)}
            className="h-8 w-8 p-0 text-neutral-400 hover:text-neutral-800"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Device Summary */}
        <div className="p-3.5 bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 flex items-start justify-between">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 mt-0.5">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-500">{t("device")}</p>
              <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                {draft.device.brandText ? `${draft.device.brandText} ` : ""}
                {draft.device.model}
                {draft.device.color ? ` (${draft.device.color})` : ""}
              </p>
              {primaryImei && (
                <p className="text-xs text-neutral-600 dark:text-neutral-400 font-mono">
                  IMEI: {primaryImei.value}
                </p>
              )}
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setStep(1)}
            className="h-8 w-8 p-0 text-neutral-400 hover:text-neutral-800"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Problem & Lock */}
        <div className="p-3.5 bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 flex items-start justify-between">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-amber-600 mt-0.5">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-500">{t("faultAndLock")}</p>
              <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                {draft.faultDescription}
              </p>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 capitalize mt-0.5">
                {t("lock")}: {t(`lockTypes.${draft.lockType}`)}
                {draft.lockType !== "none" && draft.lockValue ? ` (${t("configured")})` : ""}
              </p>
              {draft.internalNote && (
                <p className="text-xs text-neutral-500 italic mt-0.5">
                  Note: {draft.internalNote}
                </p>
              )}
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setStep(4)}
            className="h-8 w-8 p-0 text-neutral-400 hover:text-neutral-800"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Condition & Photos */}
        <div className="p-3.5 bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 flex items-start justify-between">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 mt-0.5">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-500">{t("conditionAndPhotos")}</p>
              {draft.conditionTags.length > 0 ? (
                <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100 mt-0.5">
                  {draft.conditionTags.map((tag) => t(`conditionTags.${tag}`)).join(", ")}
                </p>
              ) : (
                <p className="text-xs text-neutral-400">{t("noneRecorded")}</p>
              )}
              {draft.photos.length > 0 && (
                <p className="text-xs text-sky-600 font-semibold mt-0.5 flex items-center gap-1">
                  <Camera className="w-3 h-3" />
                  {draft.photos.length} {t("photosAttached")}
                </p>
              )}
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setStep(2)}
            className="h-8 w-8 p-0 text-neutral-400 hover:text-neutral-800"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Accessories */}
        <div className="p-3.5 bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 flex items-start justify-between">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950 flex items-center justify-center text-purple-600 mt-0.5">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-500">{t("receivedAccessories")}</p>
              {draft.accessories.length > 0 ? (
                <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100 mt-0.5">
                  {draft.accessories.join(", ")}
                </p>
              ) : (
                <p className="text-xs text-neutral-400">{t("noneRecorded")}</p>
              )}
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setStep(3)}
            className="h-8 w-8 p-0 text-neutral-400 hover:text-neutral-800"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Estimate, Date & Assignment */}
        <div className="p-3.5 bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 flex items-start justify-between">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-950 flex items-center justify-center text-teal-600 mt-0.5">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-500">{t("estimateAndTechnician")}</p>
              <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                {draft.estimatePaise > 0 ? formatPaise(draft.estimatePaise) : t("noEstimateSet")}
              </p>
              {draft.expectedDate && (
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  {t("expectedBy")}: {formatDate(draft.expectedDate, locale)}
                </p>
              )}
              <p className="text-xs text-neutral-600 dark:text-neutral-400 capitalize">
                {t("assignedTo")}: {assignedStaff?.display_name || t("unassignedOption")} •{" "}
                <span className="font-semibold">{t(`priorities.${draft.priority}`)}</span>
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setStep(5)}
            className="h-8 w-8 p-0 text-neutral-400 hover:text-neutral-800"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
