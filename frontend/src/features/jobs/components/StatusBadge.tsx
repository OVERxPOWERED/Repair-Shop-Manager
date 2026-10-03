"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { type JobStatus, STATUS_STYLE } from "../status";

export interface StatusBadgeProps {
  status: JobStatus;
  className?: string;
  showDot?: boolean;
  size?: "sm" | "md";
}

export function StatusBadge({
  status,
  className,
  showDot = true,
  size = "sm",
}: StatusBadgeProps) {
  const t = useTranslations("jobs");
  const style = STATUS_STYLE[status] || {
    badge: "bg-neutral-100 text-neutral-800 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-200",
    dot: "bg-neutral-500",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-semibold select-none shrink-0",
        size === "sm" ? "px-2.5 py-0.5 text-[11px]" : "px-3 py-1 text-xs",
        style.badge,
        className
      )}
    >
      {showDot && (
        <span
          className={cn("rounded-full shrink-0", size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2", style.dot)}
          aria-hidden="true"
        />
      )}
      <span className="capitalize">{t(`status.${status}`)}</span>
    </span>
  );
}
