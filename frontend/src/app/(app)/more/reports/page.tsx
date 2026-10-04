"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Calendar,
  BarChart3,
  TrendingUp,
  CreditCard,
  Receipt,
  Wrench,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Loader2,
  RefreshCw,
  Coins,
  DollarSign,
  PieChart,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { usePermission } from "@/lib/auth/store";
import { formatPaise } from "@/lib/format/money";
import { useReportsSummary } from "@/features/reports/api";

type RangePreset = "today" | "7d" | "month" | "fy" | "custom";

function getISTDate(offsetDays = 0): string {
  const d = new Date();
  if (offsetDays !== 0) {
    d.setDate(d.getDate() + offsetDays);
  }
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function getMonthStartDate(): string {
  const todayStr = getISTDate(); // YYYY-MM-DD
  return todayStr.slice(0, 7) + "-01";
}

function getFYStartDate(): string {
  const todayStr = getISTDate();
  const year = parseInt(todayStr.slice(0, 4), 10);
  const month = parseInt(todayStr.slice(5, 7), 10);
  const fyYear = month >= 4 ? year : year - 1;
  return `${fyYear}-04-01`;
}

export default function ReportsPage() {
  const router = useRouter();
  const t = useTranslations("reports");

  const canViewBasic = usePermission("reports.view_basic");
  const canViewProfit = usePermission("reports.view_profit");

  const [preset, setPreset] = useState<RangePreset>("today");
  const [customFrom, setCustomFrom] = useState(() => getISTDate(-7));
  const [customTo, setCustomTo] = useState(() => getISTDate());

  const { fromDate, toDate } = useMemo(() => {
    const today = getISTDate();
    switch (preset) {
      case "today":
        return { fromDate: today, toDate: today };
      case "7d":
        return { fromDate: getISTDate(-6), toDate: today };
      case "month":
        return { fromDate: getMonthStartDate(), toDate: today };
      case "fy":
        return { fromDate: getFYStartDate(), toDate: today };
      case "custom":
        return { fromDate: customFrom, toDate: customTo };
    }
  }, [preset, customFrom, customTo]);

  const {
    data: report,
    isLoading,
    error,
    refetch,
  } = useReportsSummary(canViewBasic ? fromDate : "", canViewBasic ? toDate : "");

  if (!canViewBasic) {
    return (
      <div className="min-h-screen bg-neutral-50 pb-24">
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 px-4 py-3.5">
          <div className="max-w-xl mx-auto flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="w-9 h-9 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-600 hover:bg-neutral-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-base font-bold text-neutral-900">Reports & Analytics</h1>
          </div>
        </header>

        <main className="max-w-xl mx-auto p-4 pt-12">
          <div className="bg-white rounded-3xl p-8 text-center border border-neutral-200 space-y-4 shadow-sm">
            <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
            <h2 className="text-lg font-bold text-neutral-900">Access Restricted</h2>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto leading-relaxed">
              You do not have permission to view store reports. Please contact your shop administrator.
            </p>
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="rounded-xl mt-2 text-xs"
            >
              Go Back
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const presetsList: { id: RangePreset; label: string }[] = [
    { id: "today", label: "Today" },
    { id: "7d", label: "Last 7 Days" },
    { id: "month", label: "This Month" },
    { id: "fy", label: "This FY" },
    { id: "custom", label: "Custom" },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 px-4 py-3.5">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="w-9 h-9 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-600 hover:bg-neutral-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base font-bold text-neutral-900">Reports & Analytics</h1>
              <p className="text-xs text-neutral-500">
                {fromDate === toDate ? fromDate : `${fromDate} to ${toDate}`}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-5">
        {/* Preset Range Selector */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {presetsList.map((p) => {
              const isSelected = preset === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setPreset(p.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                    isSelected
                      ? "bg-neutral-900 text-white shadow-sm"
                      : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-100"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Custom Date Pickers */}
          {preset === "custom" && (
            <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm p-4 grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-neutral-600">From Date</label>
                <Input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="h-10 rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-neutral-600">To Date</label>
                <Input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="h-10 rounded-xl text-xs"
                />
              </div>
            </div>
          )}
        </div>

        {/* Content States */}
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-neutral-400 animate-spin" />
            <p className="text-xs text-neutral-500">Computing shop metrics...</p>
          </div>
        ) : error || !report ? (
          <div className="bg-white rounded-2xl p-6 text-center border border-neutral-200 space-y-3">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
            <p className="text-sm font-semibold text-neutral-800">Failed to load reports</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="rounded-xl">
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Retry
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* 1. Jobs Overview Card */}
            <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Wrench className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm font-bold text-neutral-900">Repair Jobs Intake</h2>
                </div>
                <Badge variant="outline" className="text-[10px] text-neutral-500 border-neutral-200">
                  {report.range.days} {report.range.days === 1 ? "Day" : "Days"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-100">
                  <p className="text-[11px] font-semibold text-neutral-500">Jobs Received</p>
                  <p className="text-2xl font-black text-neutral-900 mt-1 tabular-nums">
                    {report.jobs.received}
                  </p>
                </div>
                <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-100">
                  <p className="text-[11px] font-semibold text-neutral-500">Jobs Delivered</p>
                  <p className="text-2xl font-black text-emerald-600 mt-1 tabular-nums">
                    {report.jobs.delivered}
                  </p>
                </div>
              </div>

              {/* Status Breakdown Pills */}
              {Object.keys(report.jobs.by_status).length > 0 && (
                <div className="pt-2 border-t border-neutral-100 space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                    Jobs by Current Status
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(report.jobs.by_status).map(([st, cnt]) => (
                      <div
                        key={st}
                        className="px-2.5 py-1 rounded-lg bg-neutral-100 text-xs font-semibold text-neutral-700 flex items-center gap-1.5"
                      >
                        <span className="capitalize">{st.replace(/_/g, " ")}:</span>
                        <span className="font-bold tabular-nums text-neutral-900">{cnt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Collections Overview Card */}
            <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Coins className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm font-bold text-neutral-900">Collections (Cash Flow)</h2>
                </div>
              </div>

              <div className="bg-emerald-50/60 rounded-xl p-4 border border-emerald-100">
                <p className="text-xs font-semibold text-emerald-800">Total Money Collected</p>
                <p className="text-2xl font-black text-emerald-900 mt-1 tabular-nums">
                  {formatPaise(report.collections.total_paise)}
                </p>
              </div>

              {/* By Mode */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                  <span className="text-[11px] font-semibold text-neutral-500">Cash</span>
                  <p className="text-sm font-bold text-neutral-900 mt-0.5 tabular-nums">
                    {formatPaise(report.collections.by_mode.cash)}
                  </p>
                </div>
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                  <span className="text-[11px] font-semibold text-neutral-500">UPI / QR</span>
                  <p className="text-sm font-bold text-neutral-900 mt-0.5 tabular-nums">
                    {formatPaise(report.collections.by_mode.upi)}
                  </p>
                </div>
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                  <span className="text-[11px] font-semibold text-neutral-500">Card</span>
                  <p className="text-sm font-bold text-neutral-900 mt-0.5 tabular-nums">
                    {formatPaise(report.collections.by_mode.card)}
                  </p>
                </div>
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                  <span className="text-[11px] font-semibold text-neutral-500">Bank Transfer</span>
                  <p className="text-sm font-bold text-neutral-900 mt-0.5 tabular-nums">
                    {formatPaise(report.collections.by_mode.bank)}
                  </p>
                </div>
              </div>

              {/* Refunds */}
              {report.collections.refunds_paise > 0 && (
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 flex items-center justify-between text-xs">
                  <span className="font-semibold text-rose-700">Refunds Issued</span>
                  <span className="font-bold text-rose-900 tabular-nums">
                    -{formatPaise(report.collections.refunds_paise)}
                  </span>
                </div>
              )}
            </div>

            {/* 3. Invoiced Revenue Card */}
            <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm font-bold text-neutral-900">Invoiced Revenue</h2>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-500">Invoiced Bills</span>
                  <span className="font-semibold text-neutral-900 tabular-nums">
                    {formatPaise(report.revenue.invoiced_paise)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-500">Credit Notes</span>
                  <span className="font-semibold text-rose-600 tabular-nums">
                    -{formatPaise(report.revenue.credit_notes_paise)}
                  </span>
                </div>

                <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-900">Net Billed Revenue</span>
                  <span className="text-base font-black text-neutral-900 tabular-nums">
                    {formatPaise(report.revenue.net_paise)}
                  </span>
                </div>
              </div>
            </div>

            {/* 4. Gross Profit & Margins (GATED to reports.view_profit) */}
            {canViewProfit && report.profit && (
              <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-neutral-900">Profit & Margins</h2>
                      <p className="text-[11px] text-neutral-400">Based on delivered jobs in period</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                    Confidential
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-100">
                    <p className="text-[11px] font-semibold text-neutral-500">Parts & Labor Cost</p>
                    <p className="text-lg font-bold text-neutral-800 mt-1 tabular-nums">
                      {formatPaise(report.profit.parts_cost_paise)}
                    </p>
                  </div>
                  <div className="bg-emerald-50/60 rounded-xl p-3 border border-emerald-100">
                    <p className="text-[11px] font-semibold text-emerald-800">Gross Profit</p>
                    <p className="text-lg font-black text-emerald-900 mt-1 tabular-nums">
                      {formatPaise(report.profit.gross_profit_paise)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
