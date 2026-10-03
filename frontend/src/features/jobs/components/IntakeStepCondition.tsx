"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { PhotoStrip, JobPhotoItem } from "../PhotoStrip";
import { useIntakeStore } from "../intake-store";

const TAG_KEYS = [
  "screen_cracked",
  "touch_not_working",
  "display_lines",
  "back_glass_broken",
  "body_scratched",
  "body_dented",
  "body_bent",
  "liquid_damage",
  "camera_lens_cracked",
  "battery_swollen",
  "loose_charging_port",
  "speaker_distorted",
  "overheating",
  "missing_screws",
] as const;

export function IntakeStepCondition() {
  const t = useTranslations("intake");
  const draft = useIntakeStore((s) => s.draft);
  const updateDraft = useIntakeStore((s) => s.updateDraft);
  const addPhoto = useIntakeStore((s) => s.addPhoto);
  const removePhoto = useIntakeStore((s) => s.removePhoto);

  const toggleTag = (tag: string) => {
    const current = draft.conditionTags || [];
    const next = current.includes(tag)
      ? current.filter((t) => t !== tag)
      : [...current, tag];
    updateDraft({ conditionTags: next });
  };

  const photoItems: JobPhotoItem[] = (draft.photos || []).map((p) => ({
    id: p.localId,
    url: p.previewUrl || (p.blob ? URL.createObjectURL(p.blob) : ""),
    kind: p.kind,
    caption: p.caption,
  }));

  const handleAddPhoto = async (blob: Blob, kind: string, caption?: string) => {
    const localId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
    const previewUrl = URL.createObjectURL(blob);
    addPhoto({
      localId,
      blob,
      previewUrl,
      kind: kind as "before" | "after" | "damage" | "other",
      caption,
    });
  };

  const handleDeletePhoto = async (photoId: string) => {
    removePhoto(photoId);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
          {t("stepConditionTitle")}
        </h2>
        <p className="text-xs text-neutral-500 mt-0.5">
          {t("stepConditionSubtitle")}
        </p>
      </div>

      {/* Condition Tags Chips */}
      <div>
        <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-2">
          {t("selectConditionChips")}
        </label>
        <div className="flex flex-wrap gap-1.5">
          {TAG_KEYS.map((tag) => {
            const isSelected = (draft.conditionTags || []).includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  isSelected
                    ? "bg-sky-50 dark:bg-sky-950/40 border-sky-500 text-sky-700 dark:text-sky-300 shadow-sm"
                    : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300"
                }`}
              >
                {isSelected && <Check className="w-3.5 h-3.5 text-sky-600" />}
                {t(`conditionTags.${tag}`)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Free Text Description */}
      <div>
        <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
          {t("deviceConditionNotes")}
        </label>
        <Textarea
          rows={3}
          placeholder={t("deviceConditionNotesPlaceholder")}
          value={draft.deviceCondition || ""}
          onChange={(e) => updateDraft({ deviceCondition: e.target.value })}
          className="text-sm rounded-2xl"
        />
      </div>

      {/* Photo Capture Section */}
      <div>
        <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1.5">
          {t("devicePhotos")} ({draft.photos.length}/20)
        </label>
        <PhotoStrip
          photos={photoItems}
          canEdit={true}
          onAddPhoto={handleAddPhoto}
          onDeletePhoto={handleDeletePhoto}
        />
      </div>
    </div>
  );
}
