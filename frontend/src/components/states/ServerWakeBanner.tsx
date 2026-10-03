"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useServerWakeStore } from "@/lib/server-wake";

export function ServerWakeBanner() {
  const t = useTranslations("states");
  const waking = useServerWakeStore((s) => s.waking);

  if (!waking) return null;

  return (
    <div className="sticky top-0 z-50 w-full bg-blue-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 shadow-sm animate-in slide-in-from-top duration-200">
      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
      <span>{t("serverWaking")}</span>
    </div>
  );
}
