"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Plus, X, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useAccessoryOptions } from "../api";
import { useIntakeStore } from "../intake-store";

export function IntakeStepAccessories() {
  const t = useTranslations("intake");
  const draft = useIntakeStore((s) => s.draft);
  const updateDraft = useIntakeStore((s) => s.updateDraft);

  const { data: accessoryOptions = [], isPending } = useAccessoryOptions();
  const [customAccessory, setCustomAccessory] = useState("");

  // Initialize with shop defaults on first load if draft accessories is completely empty and unvisited
  useEffect(() => {
    if (accessoryOptions.length > 0 && draft.accessories.length === 0 && draft.step === 3) {
      const defaults = accessoryOptions
        .filter((opt) => opt.is_default)
        .map((opt) => opt.name);
      if (defaults.length > 0) {
        updateDraft({ accessories: defaults });
      }
    }
  }, [accessoryOptions, draft.accessories.length, draft.step, updateDraft]);

  const toggleAccessory = (name: string) => {
    const current = draft.accessories || [];
    const next = current.includes(name)
      ? current.filter((item) => item !== name)
      : [...current, name];
    updateDraft({ accessories: next });
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customAccessory.trim();
    if (!trimmed) return;
    if (!(draft.accessories || []).includes(trimmed)) {
      updateDraft({ accessories: [...(draft.accessories || []), trimmed] });
    }
    setCustomAccessory("");
  };

  const handleRemove = (name: string) => {
    updateDraft({
      accessories: (draft.accessories || []).filter((item) => item !== name),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
          {t("stepAccessoriesTitle")}
        </h2>
        <p className="text-xs text-neutral-500 mt-0.5">
          {t("stepAccessoriesSubtitle")}
        </p>
      </div>

      {isPending ? (
        <p className="text-xs text-neutral-400 py-3">{t("loadingAccessories")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {accessoryOptions.map((opt) => {
            const isChecked = (draft.accessories || []).includes(opt.name);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => toggleAccessory(opt.name)}
                className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                  isChecked
                    ? "bg-sky-50 dark:bg-sky-950/40 border-sky-500 text-sky-900 dark:text-sky-100 shadow-sm"
                    : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300"
                }`}
              >
                <span className="text-xs font-semibold">{opt.name}</span>
                <div
                  className={`w-5 h-5 rounded-lg flex items-center justify-center transition-colors ${
                    isChecked
                      ? "bg-sky-500 text-white"
                      : "border border-neutral-300 dark:border-neutral-700"
                  }`}
                >
                  {isChecked && <Check className="w-3.5 h-3.5" />}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Add Custom Accessory Form */}
      <div>
        <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1.5">
          {t("otherAccessory")}
        </label>
        <form onSubmit={handleAddCustom} className="flex gap-2">
          <Input
            type="text"
            placeholder={t("otherAccessoryPlaceholder")}
            value={customAccessory}
            onChange={(e) => setCustomAccessory(e.target.value)}
            className="h-11 text-sm rounded-xl"
          />
          <Button
            type="submit"
            variant="secondary"
            className="h-11 px-4 rounded-xl text-xs font-semibold shrink-0"
          >
            <Plus className="w-4 h-4 mr-1" />
            {t("add")}
          </Button>
        </form>
      </div>

      {/* Currently Checked List */}
      {draft.accessories.length > 0 && (
        <div className="pt-2">
          <p className="text-xs font-semibold text-neutral-500 mb-2">
            {t("receivedAccessoriesSelected")} ({draft.accessories.length}):
          </p>
          <div className="flex flex-wrap gap-1.5">
            {draft.accessories.map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700"
              >
                {item}
                <button
                  type="button"
                  onClick={() => handleRemove(item)}
                  className="hover:text-red-500 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
