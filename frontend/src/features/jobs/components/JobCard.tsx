"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight, Clock, User, Wrench } from "lucide-react";
import { useTranslations } from "next-intl";
import { type Job } from "../api";
import { StatusBadge } from "./StatusBadge";
import { formatPaise } from "@/lib/format/money";
import { formatDate } from "@/lib/format/date";
import { usePermission } from "@/lib/auth/store";
import { useLocaleStore } from "@/i18n/store";
import { cn } from "@/lib/utils";

export interface JobCardProps {
  job: Job;
  className?: string;
}

export function JobCard({ job, className }: JobCardProps) {
  const t = useTranslations("jobs");
  const locale = useLocaleStore((s) => s.locale);
  const canSeeCostProfit = usePermission("money.see_cost_profit");
  const canViewInvoices = usePermission("invoices.view");
  const canSeeMoney = canSeeCostProfit || canViewInvoices;

  const firstLineFault = job.fault_description.split("\n")[0]?.trim() || "";
  const brandAndModel = [job.device.brand_name, job.device.model].filter(Boolean).join(" ");

  return (
    <Link
      href={`/jobs/detail/?id=${job.id}`}
      className={cn(
        "block rounded-2xl border border-neutral-200/90 dark:border-border bg-white dark:bg-card p-4 transition-all duration-150 hover:border-neutral-300 dark:hover:border-neutral-700 active:scale-[0.99] shadow-sm",
        className
      )}
    >
      {/* Top Header: Job #, Priority chip, Status Badge */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-neutral-900 dark:text-neutral-100">
            #{job.job_no}
          </span>
          {job.priority === "urgent" && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
              {t("detail.priority.urgent")}
            </span>
          )}
        </div>
        <StatusBadge status={job.status} />
      </div>

      {/* Primary Details: Customer & Device */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="font-semibold text-neutral-950 dark:text-neutral-50 truncate">
            {job.customer.name}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
            {firstLineFault || "Repair inquiry"}
          </p>
        </div>
        <div className="text-right">
          <p className="font-medium text-neutral-800 dark:text-neutral-200 truncate">
            {brandAndModel || "Device"}
          </p>
          {job.expected_date ? (
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 flex items-center justify-end gap-1">
              <Clock className="w-3 h-3 text-neutral-400" />
              <span>{formatDate(job.expected_date, locale)}</span>
            </p>
          ) : (
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
              {formatDate(job.created_at, locale)}
            </p>
          )}
        </div>
      </div>

      {/* Footer: Estimate / Total & Assignee */}
      <div className="flex items-center justify-between pt-3 mt-3 border-t border-neutral-100 dark:border-neutral-800/80 text-xs">
        <div>
          {canSeeMoney && job.estimate_paise > 0 ? (
            <span className="font-semibold text-neutral-900 dark:text-neutral-100 tabular-nums">
              {formatPaise(job.estimate_paise)}
            </span>
          ) : (
            <span className="text-neutral-400 text-[11px]">
              {formatDate(job.created_at, locale)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
          {job.assigned_to ? (
            <span className="flex items-center gap-1 truncate max-w-[140px]">
              <User className="w-3 h-3 text-neutral-400 shrink-0" />
              <span className="truncate">{job.assigned_to.display_name}</span>
            </span>
          ) : (
            <span className="text-neutral-400 italic">{t("list.unassigned")}</span>
          )}
          <ChevronRight className="w-3.5 h-3.5 text-neutral-400 ml-0.5" />
        </div>
      </div>
    </Link>
  );
}
