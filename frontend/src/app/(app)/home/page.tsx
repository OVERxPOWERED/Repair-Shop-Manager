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
  AlertTriangle,
  ChevronRight,
  Sparkles,
  Mail,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@/lib/auth/store";

export default function HomePage() {
  const t = useTranslations("home");
  const { user, pendingInvites } = useAuthStore();

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

  return (
    <div className="flex-1 px-4 pt-4 space-y-4 animate-in fade-in duration-300">
      {/* 1. Greeting & Date Pill */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-950">
            {greeting}, {firstName}
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">Let&apos;s keep your shop running smoothly.</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-100 text-xs font-semibold text-neutral-700 shadow-sm border border-neutral-200/60">
          <Calendar className="w-3.5 h-3.5 text-neutral-500" />
          <span>{dateStr}</span>
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
            <p className="text-xs font-medium text-neutral-400">Today&apos;s Jobs</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold tracking-tight tabular-nums">0</span>
              <span className="text-[11px] font-semibold text-neutral-400 flex items-center gap-1 bg-neutral-900 px-2 py-0.5 rounded-full border border-neutral-800">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Live counts arrive with job sheets
              </span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center">
            <Wrench className="w-6 h-6 text-neutral-300" />
          </div>
        </div>

        {/* Sub Counters */}
        <div className="grid grid-cols-4 gap-2 pt-3 border-t border-neutral-800/80 text-center">
          <div>
            <div className="text-base font-bold tabular-nums text-white">0</div>
            <div className="text-[10px] text-neutral-400 font-medium">In Progress</div>
          </div>
          <div>
            <div className="text-base font-bold tabular-nums text-amber-400">0</div>
            <div className="text-[10px] text-neutral-400 font-medium">Pending</div>
          </div>
          <div>
            <div className="text-base font-bold tabular-nums text-emerald-400">0</div>
            <div className="text-[10px] text-neutral-400 font-medium">Repaired</div>
          </div>
          <div>
            <div className="text-base font-bold tabular-nums text-purple-400">0</div>
            <div className="text-[10px] text-neutral-400 font-medium">Delivered</div>
          </div>
        </div>
      </div>

      {/* 3. Quick Operations Grid (8 Tiles) */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2.5">
          Quick Operations
        </h2>
        <div className="grid grid-cols-4 gap-2.5">
          {/* Tile 1: Add Job */}
          <Link
            href="/jobs/new/"
            className="relative col-span-1 aspect-square rounded-2xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex flex-col items-center justify-center p-2 text-center shadow-sm active:scale-95 transition-transform"
          >
            <Plus className="w-5 h-5 mb-1 text-white dark:text-neutral-900" />
            <span className="text-[11px] font-bold leading-tight">Add Job</span>
          </Link>

          {/* Tile 2: Rough Reg */}
          <button
            type="button"
            disabled
            className="relative col-span-1 aspect-square rounded-2xl bg-white border border-neutral-200/90 text-neutral-400 flex flex-col items-center justify-center p-2 text-center cursor-not-allowed"
          >
            <FileText className="w-5 h-5 mb-1 text-neutral-400" />
            <span className="text-[11px] font-medium leading-tight">Rough Reg</span>
            <span className="absolute top-1.5 right-1.5 px-1 py-0.2 rounded bg-neutral-100 text-neutral-500 text-[9px] font-semibold uppercase">
              Soon
            </span>
          </button>

          {/* Tile 3: Quick Bill */}
          <button
            type="button"
            disabled
            className="relative col-span-1 aspect-square rounded-2xl bg-white border border-neutral-200/90 text-neutral-400 flex flex-col items-center justify-center p-2 text-center cursor-not-allowed"
          >
            <Receipt className="w-5 h-5 mb-1 text-neutral-400" />
            <span className="text-[11px] font-medium leading-tight">Quick Bill</span>
            <span className="absolute top-1.5 right-1.5 px-1 py-0.2 rounded bg-neutral-100 text-neutral-500 text-[9px] font-semibold uppercase">
              Soon
            </span>
          </button>

          {/* Tile 4: Old Buy */}
          <button
            type="button"
            disabled
            className="relative col-span-1 aspect-square rounded-2xl bg-white border border-neutral-200/90 text-neutral-400 flex flex-col items-center justify-center p-2 text-center cursor-not-allowed"
          >
            <Smartphone className="w-5 h-5 mb-1 text-neutral-400" />
            <span className="text-[11px] font-medium leading-tight">Old Buy</span>
            <span className="absolute top-1.5 right-1.5 px-1 py-0.2 rounded bg-neutral-100 text-neutral-500 text-[9px] font-semibold uppercase">
              Soon
            </span>
          </button>

          {/* Tile 5: H/W Match */}
          <button
            type="button"
            disabled
            className="relative col-span-1 aspect-square rounded-2xl bg-white border border-neutral-200/90 text-neutral-400 flex flex-col items-center justify-center p-2 text-center cursor-not-allowed"
          >
            <Cpu className="w-5 h-5 mb-1 text-neutral-400" />
            <span className="text-[11px] font-medium leading-tight">H/W Match</span>
            <span className="absolute top-1.5 right-1.5 px-1 py-0.2 rounded bg-neutral-100 text-neutral-500 text-[9px] font-semibold uppercase">
              Soon
            </span>
          </button>

          {/* Tile 6: Demands */}
          <button
            type="button"
            disabled
            className="relative col-span-1 aspect-square rounded-2xl bg-white border border-neutral-200/90 text-neutral-400 flex flex-col items-center justify-center p-2 text-center cursor-not-allowed"
          >
            <ShoppingBag className="w-5 h-5 mb-1 text-neutral-400" />
            <span className="text-[11px] font-medium leading-tight">Demands</span>
            <span className="absolute top-1.5 right-1.5 px-1 py-0.2 rounded bg-neutral-100 text-neutral-500 text-[9px] font-semibold uppercase">
              Soon
            </span>
          </button>

          {/* Tile 7: Stolen Check */}
          <button
            type="button"
            disabled
            className="relative col-span-1 aspect-square rounded-2xl bg-white border border-neutral-200/90 text-neutral-400 flex flex-col items-center justify-center p-2 text-center cursor-not-allowed"
          >
            <ShieldCheck className="w-5 h-5 mb-1 text-neutral-400" />
            <span className="text-[11px] font-medium leading-tight">Stolen Check</span>
            <span className="absolute top-1.5 right-1.5 px-1 py-0.2 rounded bg-neutral-100 text-neutral-500 text-[9px] font-semibold uppercase">
              Soon
            </span>
          </button>

          {/* Tile 8: Dealers */}
          <button
            type="button"
            disabled
            className="relative col-span-1 aspect-square rounded-2xl bg-white border border-neutral-200/90 text-neutral-400 flex flex-col items-center justify-center p-2 text-center cursor-not-allowed"
          >
            <Store className="w-5 h-5 mb-1 text-neutral-400" />
            <span className="text-[11px] font-medium leading-tight">Dealers</span>
            <span className="absolute top-1.5 right-1.5 px-1 py-0.2 rounded bg-neutral-100 text-neutral-500 text-[9px] font-semibold uppercase">
              Soon
            </span>
          </button>
        </div>
      </div>

      {/* 4. Financial & Stock Summary Widgets */}
      <div className="grid grid-cols-2 gap-3">
        {/* Revenue Widget */}
        <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-500">Revenue</span>
              <span className="text-[10px] font-semibold text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded-md">
                ₹0
              </span>
            </div>
            <div className="text-lg font-bold tabular-nums text-neutral-950 mt-1">₹0</div>
          </div>
          <p className="text-[10px] text-neutral-400 mt-2">Begins with invoices</p>
        </div>

        {/* Low Stock Items Widget */}
        <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-500">Low Stock</span>
              <AlertTriangle className="w-3.5 h-3.5 text-neutral-300" />
            </div>
            <div className="text-lg font-bold tabular-nums text-neutral-950 mt-1">0 items</div>
          </div>
          <p className="text-[10px] text-neutral-400 mt-2">Inventory tracking in Phase 2</p>
        </div>
      </div>

      {/* 5. Recent Job Sheets Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Recent Job Sheets
          </h2>
        </div>

        <div className="p-6 rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/50 flex flex-col items-center justify-center text-center">
          <Wrench className="h-8 w-8 text-neutral-300 stroke-[1.5] mb-2" />
          <p className="text-xs font-semibold text-neutral-700">No repair jobs yet</p>
          <p className="text-[11px] text-neutral-400 mt-0.5 max-w-xs">
            Job sheets created at the front desk will show up here.
          </p>
        </div>
      </div>
    </div>
  );
}
