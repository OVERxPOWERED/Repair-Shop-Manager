"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/forms/MoneyInput";
import { todayIst } from "@/lib/format/date";
import { useIntakeStore } from "../intake-store";

interface IntakeStepEstimateProps {
  errors?: Record<string, string>;
  onNext?: () => void;
}

export function IntakeStepEstimate({ errors, onNext }: IntakeStepEstimateProps) {
  const t = useTranslations("intake");
  const tBilling = useTranslations("billing");
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
          id="intake-estimate-cost"
          value={draft.estimatePaise || 0}
          onChange={(paise) => updateDraft({ estimatePaise: paise })}
          placeholder="0.00"
          error={errors?.estimatePaise}
          enterKeyHint="next"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              document.getElementById("intake-advance-amount")?.focus();
            }
          }}
        />
        <p className="text-[11px] text-neutral-400 mt-1">
          {t("estimateHint")}
        </p>
      </div>

      {/* Advance Payment (Optional) */}
      <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-3">
        <div>
          <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
            {tBilling("advance.intakeLabel")}
          </label>
          <MoneyInput
            id="intake-advance-amount"
            value={draft.advancePaise || 0}
            onChange={(paise) => updateDraft({ advancePaise: paise })}
            placeholder="0.00"
            enterKeyHint="next"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                document.getElementById("intake-expected-date")?.focus();
              }
            }}
          />
          <p className="text-[11px] text-neutral-400 mt-1">
            {tBilling("advance.intakeHint")}
          </p>
        </div>

        {draft.advancePaise > 0 && (
          <div className="space-y-3 animate-in fade-in duration-200">
            <div>
              <label className="text-xs text-neutral-500 font-medium mb-1.5 block">
                {tBilling("payment.modeLabel")}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(["cash", "upi", "card", "bank"] as const).map((m) => (
                  <button
                    type="button"
                    key={m}
                    onClick={() => updateDraft({ advanceMode: m })}
                    className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                      draft.advanceMode === m
                        ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-neutral-900 dark:border-white shadow-sm"
                        : "bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700"
                    }`}
                  >
                    {tBilling(`payment.modes.${m}`)}
                  </button>
                ))}
              </div>
            </div>

            {draft.advanceMode !== "cash" && (
              <div>
                <label className="text-xs text-neutral-500 font-medium mb-1.5 block">
                  {draft.advanceMode === "upi"
                    ? tBilling("payment.upiRefLabel")
                    : draft.advanceMode === "card"
                    ? tBilling("payment.cardRefLabel")
                    : tBilling("payment.bankRefLabel")}
                </label>
                <Input
                  value={draft.advanceReference || ""}
                  onChange={(e) => updateDraft({ advanceReference: e.target.value })}
                  placeholder="e.g. UPI Ref / UTR / Card Slip"
                  className="h-11 text-xs"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expected Delivery Date */}
      <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
        <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
          {t("expectedDeliveryDate")}
        </label>
        <div className="relative">
          <Calendar className="w-4 h-4 text-neutral-400 absolute left-3 top-3.5" />
          <Input
            id="intake-expected-date"
            type="date"
            min={minDate}
            value={draft.expectedDate || ""}
            onChange={(e) => updateDraft({ expectedDate: e.target.value || null })}
            enterKeyHint="go"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onNext?.();
              }
            }}
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
