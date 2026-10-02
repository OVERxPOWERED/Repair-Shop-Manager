"use client";

import React from "react";
import { locales, localeLabels, type Locale } from "@/i18n/config";
import { useLocaleStore } from "@/i18n/store";

interface LanguageSwitcherProps {
  onLocaleChange?: (locale: Locale) => void;
  className?: string;
}

export function LanguageSwitcher({ onLocaleChange, className = "" }: LanguageSwitcherProps) {
  const currentLocale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);

  const handleSelect = (locale: Locale) => {
    setLocale(locale);
    onLocaleChange?.(locale);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {locales.map((loc) => {
        const isSelected = currentLocale === loc;
        return (
          <button
            key={loc}
            type="button"
            onClick={() => handleSelect(loc)}
            className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-all ${
              isSelected
                ? "border-neutral-950 bg-neutral-950 text-white shadow-sm"
                : "border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-50"
            }`}
          >
            <div className="flex flex-col">
              <span className="text-base font-semibold">{localeLabels[loc]}</span>
              <span
                className={`text-xs ${
                  isSelected ? "text-neutral-400" : "text-neutral-500"
                }`}
              >
                {loc === "en" && "English (India)"}
                {loc === "hi" && "हिन्दी भाषा"}
                {loc === "hi-Latn" && "Hinglish (Hindi in Roman script)"}
              </span>
            </div>
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                isSelected
                  ? "border-white bg-white text-neutral-950"
                  : "border-neutral-300 bg-white"
              }`}
            >
              {isSelected && <div className="h-2.5 w-2.5 rounded-full bg-neutral-950" />}
            </div>
          </button>
        );
      })}
    </div>
  );
}
