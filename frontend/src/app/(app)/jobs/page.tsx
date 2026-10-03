"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Wrench, Plus, Search, X, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useJobCounts, useJobs } from "@/features/jobs/api";
import { JobCard } from "@/features/jobs/components/JobCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const FILTER_GROUPS = [
  { id: "all", labelKey: "groups.all", countKey: "all" },
  { id: "pending", labelKey: "groups.pending", countKey: "pending" },
  { id: "in_progress", labelKey: "groups.in_progress", countKey: "in_progress" },
  { id: "repaired", labelKey: "groups.repaired", countKey: "repaired" },
  { id: "delivered", labelKey: "groups.delivered", countKey: "delivered" },
  { id: "closed", labelKey: "groups.closed", countKey: "closed" },
] as const;

function JobsContent() {
  const t = useTranslations("jobs");
  const tNav = useTranslations("nav");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const selectedGroup = searchParams.get("group") || "all";
  const initialQ = searchParams.get("q") || "";

  const [searchQuery, setSearchQuery] = useState(initialQ);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQ);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: counts, isLoading: isLoadingCounts } = useJobCounts();

  const {
    data: jobsData,
    isLoading: isLoadingJobs,
    isFetching: isFetchingJobs,
  } = useJobs({
    group: selectedGroup !== "all" ? selectedGroup : undefined,
    q: debouncedQuery || undefined,
    ordering: "-updated_at",
  });

  const handleGroupSelect = (group: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (group === "all") {
      params.delete("group");
    } else {
      params.set("group", group);
    }
    startTransition(() => {
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`);
    });
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setDebouncedQuery("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    startTransition(() => {
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`);
    });
  };

  const jobs = jobsData?.items ?? [];

  return (
    <div className="flex-1 flex flex-col px-4 pt-3 pb-24 relative min-h-screen">
      {/* 1. Sticky Header Area: Search Bar & Horizontal Pill Carousel */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md pt-1 pb-3 space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("list.searchPlaceholder")}
            className="h-11 pl-10 pr-9 rounded-2xl bg-neutral-100/80 dark:bg-neutral-900 border-none text-sm placeholder:text-neutral-400 focus-visible:ring-1 focus-visible:ring-neutral-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Horizontal Scrollable Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-4 px-4">
          {FILTER_GROUPS.map((grp) => {
            const count = counts ? counts[grp.countKey] : undefined;
            const isSelected = selectedGroup === grp.id;

            return (
              <button
                key={grp.id}
                type="button"
                onClick={() => handleGroupSelect(grp.id)}
                className={cn(
                  "whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 shrink-0 border",
                  isSelected
                    ? "bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 border-neutral-950 dark:border-white shadow-sm"
                    : "bg-white dark:bg-card text-neutral-600 dark:text-neutral-400 border-neutral-200/90 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-850"
                )}
              >
                <span>{t(grp.labelKey)}</span>
                {count !== undefined && (
                  <span
                    className={cn(
                      "ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold tabular-nums",
                      isSelected
                        ? "bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900"
                        : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Jobs Feed */}
      <div className="flex-1 mt-2 space-y-2.5">
        {isLoadingJobs && jobs.length === 0 ? (
          <div className="space-y-3">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center text-neutral-400">
              <Wrench className="w-6 h-6 stroke-[1.5]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                {t("list.noJobs")}
              </p>
              <p className="text-xs text-neutral-500 max-w-xs mx-auto mt-1">
                {t("list.noJobsDesc")}
              </p>
            </div>
            <Link href="/jobs/new/" className="inline-block mt-2">
              <Button size="sm" className="rounded-xl gap-1.5">
                <Plus className="w-4 h-4" />
                <span>{t("list.createJob")}</span>
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {isFetchingJobs && (
              <div className="flex items-center justify-end py-1 text-xs text-neutral-400 gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Updating...</span>
              </div>
            )}
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </>
        )}
      </div>

      {/* 3. Floating Action Button (FAB) -> /jobs/new/ */}
      <Link
        href="/jobs/new/"
        className="fixed right-5 bottom-20 z-20 w-14 h-14 rounded-full bg-neutral-950 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 active:scale-95 text-white dark:text-neutral-950 flex items-center justify-center shadow-xl shadow-black/20 transition-all duration-150"
        aria-label={t("list.createJob")}
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </Link>
    </div>
  );
}

export default function JobsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex-1 p-4 space-y-3">
          <Skeleton className="h-11 w-full rounded-2xl" />
          <Skeleton className="h-9 w-full rounded-full" />
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      }
    >
      <JobsContent />
    </React.Suspense>
  );
}
