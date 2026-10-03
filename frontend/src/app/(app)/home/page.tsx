"use client";

import React from "react";
import Link from "next/link";
import {
  Wrench,
  Calendar,
  Plus,
  FileText,
  Receipt,
  Smartphone,
  Cpu,
  ShoppingBag,
  ShieldCheck,
  Store,
  ChevronRight,
  Mail,
  RefreshCw,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@/lib/auth/store";
import { todayIst } from "@/lib/format/date";
import { useDashboardSummary, useJobs } from "@/features/jobs/api";
import { JobCard } from "@/features/jobs/components/JobCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { CheckImeiSheet } from "@/features/devices/CheckImeiSheet";

export default function HomePage() {
  const t = useTranslations("home");
  const { user, pendingInvites } = useAuthStore();
  const [stolenCheckOpen, setStolenCheckOpen] = React.useState(false);

  const today = todayIst();
  const {
    data: summary,
    isLoading: isLoadingSummary,
    isRefetching: isRefetchingSummary,
    refetch: refetchSummary,
  } = useDashboardSummary(today);

  const {
    data: recentJobsData,
    isLoading: isLoadingRecent,
    isRefetching: isRefetchingRecent,
    refetch: refetchRecent,
  } = useJobs({ ordering: "-created_at", page_size: 5 });

  const isRefreshing = isRefetchingSummary || isRefetchingRecent;

  const handleRefresh = async () => {
    await Promise.all([refetchSummary(), refetchRecent()]);
  };

  const now = new Date();
  const istHourStr = new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    hour12: false,
    timeZone: "Asia/Kolkata",
  }).format(now);
  const hour = parseInt(istHourStr, 10);

  let greeting = "Good morning";
  if (hour >= 12 && hour < 17) {
    greeting = "Good afternoon";
  } else if (hour >= 17) {
    greeting = "Good evening";
  }

  const firstName = user?.name ? user.name.split(" ")[0] : "Friend";

  const dateStr = new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  }).format(now);

  const recentJobs = recentJobsData?.items ?? [];

  return (
    <div className="flex-1 px-4 pt-4 pb-12 space-y-4 animate-in fade-in duration-300">
      {/* 1. Greeting, Date Pill & Refresh Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-950 dark:text-neutral-50">
            {greeting}, {firstName}
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">Let&apos;s keep your shop running smoothly.</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleRefresh}
            aria-label="Refresh dashboard"
            className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-sky-500" : ""}`} />
          </button>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 shadow-sm border border-neutral-200/60 dark:border-neutral-700">
            <Calendar className="w-3.5 h-3.5 text-neutral-500" />
            <span>{dateStr}</span>
          </div>
        </div>
      </div>

      {/* Pending Invites Alert Banner */}
      {pendingInvites > 0 && (
        <Link
          href="/invites/"
          className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-950 dark:text-amber-200 transition-colors hover:bg-amber-500/15"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white shrink-0">
              <Mail className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold leading-tight">
                {t("pendingInvitesBannerTitle", { count: pendingInvites })}
              </p>
              <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
                {t("pendingInvitesBannerSubtitle")}
              </p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-amber-700 dark:text-amber-400 shrink-0" />
        </Link>
      )}

      {/* 2. Dark Hero Metric Card */}
      <div className="bg-neutral-950 text-white rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-neutral-400">{t("todaysJobs")}</p>
            <div className="flex items-baseline gap-2 mt-1">
              {isLoadingSummary ? (
                <Skeleton className="h-9 w-16 bg-neutral-800 rounded-lg" />
              ) : (
                <span className="text-3xl font-extrabold tracking-tight tabular-nums">
                  {summary?.received_today ?? 0}
                </span>
              )}
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center">
            <Wrench className="w-6 h-6 text-neutral-300" />
          </div>
        </div>

        {/* Sub Counters (clickable pills navigating to filter groups) */}
        <div className="grid grid-cols-4 gap-2 pt-3 border-t border-neutral-800/80 text-center">
          <Link
            href="/jobs/?group=in_progress"
            className="group p-1.5 rounded-xl hover:bg-neutral-900/80 transition-colors"
          >
            <div className="text-base font-bold tabular-nums text-white group-hover:text-amber-400 transition-colors">
              {isLoadingSummary ? "-" : (summary?.in_progress ?? 0)}
            </div>
            <div className="text-[10px] text-neutral-400 font-medium">{t("inProgress")}</div>
          </Link>
          <Link
            href="/jobs/?group=pending"
            className="group p-1.5 rounded-xl hover:bg-neutral-900/80 transition-colors"
          >
            <div className="text-base font-bold tabular-nums text-amber-400">
              {isLoadingSummary ? "-" : (summary?.pending ?? 0)}
            </div>
            <div className="text-[10px] text-neutral-400 font-medium">{t("pending")}</div>
          </Link>
          <Link
            href="/jobs/?group=repaired"
            className="group p-1.5 rounded-xl hover:bg-neutral-900/80 transition-colors"
          >
            <div className="text-base font-bold tabular-nums text-emerald-400">
              {isLoadingSummary ? "-" : (summary?.repaired ?? 0)}
            </div>
            <div className="text-[10px] text-neutral-400 font-medium">{t("repaired")}</div>
          </Link>
          <Link
            href="/jobs/?group=delivered"
            className="group p-1.5 rounded-xl hover:bg-neutral-900/80 transition-colors"
          >
            <div className="text-base font-bold tabular-nums text-purple-400">
              {isLoadingSummary ? "-" : (summary?.delivered_today ?? 0)}
            </div>
            <div className="text-[10px] text-neutral-400 font-medium">{t("deliveredToday")}</div>
          </Link>
        </div>
      </div>

      {/* 3. Quick Operations Grid (8 Tiles) */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2.5">
          {t("quickActions")}
        </h2>
        <div className="grid grid-cols-4 gap-2.5">
          {/* Tile 1: Add Job */}
          <Link
            href="/jobs/new/"
            className="relative col-span-1 aspect-square rounded-2xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex flex-col items-center justify-center p-2 text-center shadow-sm active:scale-95 transition-transform"
          >
            <Plus className="w-5 h-5 mb-1 text-white dark:text-neutral-900" />
            <span className="text-[11px] font-bold leading-tight">{t("addJob")}</span>
          </Link>

          {/* Tile 2: Rough Reg */}
          <button
            type="button"
            disabled
            className="relative col-span-1 aspect-square rounded-2xl bg-white dark:bg-card border border-neutral-200/90 dark:border-border text-neutral-400 flex flex-col items-center justify-center p-2 text-center cursor-not-allowed"
          >
            <FileText className="w-5 h-5 mb-1 text-neutral-400" />
            <span className="text-[11px] font-medium leading-tight">Rough Reg</span>
            <span className="absolute top-1.5 right-1.5 px-1 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500 text-[9px] font-semibold uppercase">
              Soon
            </span>
          </button>

          {/* Tile 3: Quick Bill */}
          <button
            type="button"
            disabled
            className="relative col-span-1 aspect-square rounded-2xl bg-white dark:bg-card border border-neutral-200/90 dark:border-border text-neutral-400 flex flex-col items-center justify-center p-2 text-center cursor-not-allowed"
          >
            <Receipt className="w-5 h-5 mb-1 text-neutral-400" />
            <span className="text-[11px] font-medium leading-tight">Quick Bill</span>
            <span className="absolute top-1.5 right-1.5 px-1 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500 text-[9px] font-semibold uppercase">
              Soon
            </span>
          </button>

          {/* Tile 4: Old Buy */}
          <button
            type="button"
            disabled
            className="relative col-span-1 aspect-square rounded-2xl bg-white dark:bg-card border border-neutral-200/90 dark:border-border text-neutral-400 flex flex-col items-center justify-center p-2 text-center cursor-not-allowed"
          >
            <Smartphone className="w-5 h-5 mb-1 text-neutral-400" />
            <span className="text-[11px] font-medium leading-tight">Old Buy</span>
            <span className="absolute top-1.5 right-1.5 px-1 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500 text-[9px] font-semibold uppercase">
              Soon
            </span>
          </button>

          {/* Tile 5: H/W Match */}
          <button
            type="button"
            disabled
            className="relative col-span-1 aspect-square rounded-2xl bg-white dark:bg-card border border-neutral-200/90 dark:border-border text-neutral-400 flex flex-col items-center justify-center p-2 text-center cursor-not-allowed"
          >
            <Cpu className="w-5 h-5 mb-1 text-neutral-400" />
            <span className="text-[11px] font-medium leading-tight">H/W Match</span>
            <span className="absolute top-1.5 right-1.5 px-1 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500 text-[9px] font-semibold uppercase">
              Soon
            </span>
          </button>

          {/* Tile 6: Demands */}
          <button
            type="button"
            disabled
            className="relative col-span-1 aspect-square rounded-2xl bg-white dark:bg-card border border-neutral-200/90 dark:border-border text-neutral-400 flex flex-col items-center justify-center p-2 text-center cursor-not-allowed"
          >
            <ShoppingBag className="w-5 h-5 mb-1 text-neutral-400" />
            <span className="text-[11px] font-medium leading-tight">Demands</span>
            <span className="absolute top-1.5 right-1.5 px-1 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500 text-[9px] font-semibold uppercase">
              Soon
            </span>
          </button>

          {/* Tile 7: Stolen Check */}
          <button
            type="button"
            onClick={() => setStolenCheckOpen(true)}
            className="relative col-span-1 aspect-square rounded-2xl bg-white dark:bg-card border border-neutral-200/90 dark:border-border text-neutral-800 dark:text-neutral-200 hover:border-sky-500 hover:bg-sky-50/30 dark:hover:bg-sky-950/20 flex flex-col items-center justify-center p-2 text-center shadow-sm active:scale-95 transition-all"
          >
            <ShieldCheck className="w-5 h-5 mb-1 text-sky-600 dark:text-sky-400" />
            <span className="text-[11px] font-bold leading-tight">Stolen Check</span>
          </button>

          {/* Tile 8: Dealers */}
          <button
            type="button"
            disabled
            className="relative col-span-1 aspect-square rounded-2xl bg-white dark:bg-card border border-neutral-200/90 dark:border-border text-neutral-400 flex flex-col items-center justify-center p-2 text-center cursor-not-allowed"
          >
            <Store className="w-5 h-5 mb-1 text-neutral-400" />
            <span className="text-[11px] font-medium leading-tight">Dealers</span>
            <span className="absolute top-1.5 right-1.5 px-1 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500 text-[9px] font-semibold uppercase">
              Soon
            </span>
          </button>
        </div>
      </div>

      {/* 4. Recent Job Sheets Section */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            {t("recentJobs")}
          </h2>
          {recentJobs.length > 0 && (
            <Link
              href="/jobs/"
              className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-0.5"
            >
              <span>{t("viewAll")}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {isLoadingRecent ? (
          <div className="space-y-2.5">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
          </div>
        ) : recentJobs.length === 0 ? (
          <div className="p-6 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/20 flex flex-col items-center justify-center text-center">
            <Wrench className="h-8 w-8 text-neutral-300 dark:text-neutral-600 stroke-[1.5] mb-2" />
            <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              {t("noRecentJobs")}
            </p>
            <p className="text-[11px] text-neutral-400 mt-0.5 max-w-xs">
              {t("noRecentJobsDesc")}
            </p>
            <Link href="/jobs/new/" className="mt-3">
              <Button size="sm" variant="outline" className="h-8 rounded-xl text-xs gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                <span>{t("addJob")}</span>
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2.5">
            {recentJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>

      <CheckImeiSheet
        open={stolenCheckOpen}
        onOpenChange={setStolenCheckOpen}
      />
    </div>
  );
}
