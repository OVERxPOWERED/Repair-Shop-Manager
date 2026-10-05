"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Lock, Eye, EyeOff, Plus } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { PatternInput } from "./PatternInput";
import { useIntakeStore } from "../intake-store";

interface IntakeStepProblemProps {
  errors?: Record<string, string>;
  onNext?: () => void;
}

const FAULT_CHIPS = [
  "display",
  "battery",
  "charging",
  "speaker_mic",
  "camera",
  "software",
  "water_damage",
  "no_power",
] as const;

export function IntakeStepProblem({ errors, onNext }: IntakeStepProblemProps) {
  const t = useTranslations("intake");
  const draft = useIntakeStore((s) => s.draft);
  const updateDraft = useIntakeStore((s) => s.updateDraft);

  const [showPassword, setShowPassword] = useState(false);

  const handleChipClick = (chipKey: string) => {
    const chipText = t(`faultChips.${chipKey}`);
    const current = (draft.faultDescription || "").trim();
    if (!current) {
      updateDraft({ faultDescription: chipText });
    } else if (!current.toLowerCase().includes(chipText.toLowerCase())) {
      updateDraft({ faultDescription: `${current}, ${chipText}` });
    }
  };

  const handleLockTypeChange = (type: "none" | "pin" | "pattern" | "password") => {
    updateDraft({ lockType: type, lockValue: "" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
          {t("stepProblemTitle")}
        </h2>
        <p className="text-xs text-neutral-500 mt-0.5">
          {t("stepProblemSubtitle")}
        </p>
      </div>

      {/* Fault Chips */}
      <div>
        <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1.5">
          {t("commonFaults")}
        </label>
        <div className="flex flex-wrap gap-1.5">
          {FAULT_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => handleChipClick(chip)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:border-neutral-400 hover:bg-neutral-50 transition-all"
            >
              <Plus className="w-3.5 h-3.5 text-neutral-400" />
              {t(`faultChips.${chip}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Fault Description */}
      <div>
        <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
          {t("faultDescription")} *
        </label>
        <Textarea
          rows={3}
          placeholder={t("faultDescriptionPlaceholder")}
          value={draft.faultDescription || ""}
          onChange={(e) => updateDraft({ faultDescription: e.target.value })}
          className={`text-sm rounded-2xl ${
            errors?.faultDescription ? "border-red-500" : ""
          }`}
        />
        {errors?.faultDescription && (
          <p className="text-xs text-red-500 font-medium mt-1">
            {errors.faultDescription}
          </p>
        )}
      </div>

      {/* Lock Type Selector */}
      <div className="space-y-3 pt-2">
        <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-neutral-500" />
          {t("deviceLockTitle")}
        </label>

        <div className="grid grid-cols-4 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl gap-1">
          {(["none", "pin", "pattern", "password"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => handleLockTypeChange(type)}
              className={`py-2 text-xs font-semibold rounded-lg capitalize transition-all ${
                draft.lockType === type
                  ? "bg-white dark:bg-neutral-900 text-neutral-950 dark:text-neutral-50 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-800"
              }`}
            >
              {t(`lockTypes.${type}`)}
            </button>
          ))}
        </div>

        {/* Lock Value Inputs */}
        {draft.lockType === "pin" && (
          <div className="space-y-1">
            <Input
              type="text"
              inputMode="numeric"
              placeholder={t("pinPlaceholder")}
              value={draft.lockValue || ""}
              onChange={(e) =>
                updateDraft({ lockValue: e.target.value.replace(/\D/g, "").slice(0, 16) })
              }
              enterKeyHint="go"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onNext?.();
                }
              }}
              className={`h-11 font-mono tracking-widest text-center text-lg rounded-xl ${
                errors?.lockValue ? "border-red-500" : ""
              }`}
            />
            {errors?.lockValue && (
              <p className="text-xs text-red-500 font-medium">{errors.lockValue}</p>
            )}
          </div>
        )}

        {draft.lockType === "pattern" && (
          <div className="pt-2">
            <PatternInput
              value={draft.lockValue || ""}
              onChange={(val) => updateDraft({ lockValue: val })}
              error={errors?.lockValue}
            />
          </div>
        )}

        {draft.lockType === "password" && (
          <div className="space-y-1 relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder={t("passwordPlaceholder")}
              value={draft.lockValue || ""}
              onChange={(e) => updateDraft({ lockValue: e.target.value })}
              enterKeyHint="go"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onNext?.();
                }
              }}
              className={`h-11 text-sm rounded-xl pr-10 ${
                errors?.lockValue ? "border-red-500" : ""
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-3 text-neutral-400 hover:text-neutral-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            {errors?.lockValue && (
              <p className="text-xs text-red-500 font-medium">{errors.lockValue}</p>
            )}
          </div>
        )}
      </div>

      {/* Internal Note */}
      <div className="pt-2">
        <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
          {t("internalNoteTitle")}
        </label>
        <Textarea
          rows={2}
          placeholder={t("internalNotePlaceholder")}
          value={draft.internalNote || ""}
          onChange={(e) => updateDraft({ internalNote: e.target.value })}
          className="text-sm rounded-2xl text-neutral-600 dark:text-neutral-300"
        />
        <p className="text-[11px] text-neutral-400 mt-1">
          {t("internalNoteHint")}
        </p>
      </div>
    </div>
  );
}
