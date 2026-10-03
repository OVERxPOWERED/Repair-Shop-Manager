"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Calendar, DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/forms/MoneyInput";
import { todayIst } from "@/lib/format/date";
import { useIntakeStore } from "../intake-store";

interface IntakeStepEstimateProps {
  errors?: Record<string, string>;
}

export function IntakeStepEstimate({ errors }: IntakeStepEstimateProps) {
  const t = useTranslations("intake");
  const draft = useIntakeStore((s) => s.draft);
  const updateDraft = useIntakeStore((s) => s.updateDraft);

  const minDate = todayIst();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
          {t("stepEstimateTitle")}
        </h2>
        <p className="text-xs text-neutral-500 mt-0.5">
          {t("stepEstimateSubtitle")}
        </p>
      </div>

      {/* Estimated Cost */}
      <div>
        <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
          {t("estimatedRepairCost")}
        </label>
        <MoneyInput
          value={draft.estimatePaise || 0}
          onChange={(paise) => updateDraft({ estimatePaise: paise })}
          placeholder="0.00"
          error={errors?.estimatePaise}
        />
        <p className="text-[11px] text-neutral-400 mt-1">
          {t("estimateHint")}
        </p>
      </div>

      {/* Expected Delivery Date */}
      <div>
        <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
          {t("expectedDeliveryDate")}
        </label>
        <div className="relative">
          <Calendar className="w-4 h-4 text-neutral-400 absolute left-3 top-3.5" />
          <Input
            type="date"
            min={minDate}
            value={draft.expectedDate || ""}
            onChange={(e) => updateDraft({ expectedDate: e.target.value || null })}
            className={`pl-9 h-12 text-sm rounded-2xl ${
              errors?.expectedDate ? "border-red-500" : ""
            }`}
          />
        </div>
        {errors?.expectedDate && (
          <p className="text-xs text-red-500 font-medium mt-1">
            {errors.expectedDate}
          </p>
        )}
      </div>
    </div>
  );
}
