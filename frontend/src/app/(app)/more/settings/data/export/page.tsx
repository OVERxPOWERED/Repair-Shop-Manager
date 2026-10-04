"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  FileSpreadsheet,
  Download,
  Users,
  Wrench,
  Receipt,
  CreditCard,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Lock,
} from "lucide-react";
import { useCurrentShop } from "@/lib/auth/store";
import { shareFile } from "@/native/share";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";

type ExportType = "customers" | "jobs" | "invoices" | "payments";

export default function ExportPage() {
  const t = useTranslations("export");
  const router = useRouter();
  const currentShop = useCurrentShop();

  const permissions = currentShop?.permissions || [];
  const canExport = permissions.includes("data.export");

  const [selectedType, setSelectedType] = useState<ExportType>("jobs");

  // Date range
  const todayStr = new Date().toISOString().split("T")[0];
  const thirtyDaysAgoStr = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

  const [fromDate, setFromDate] = useState(thirtyDaysAgoStr);
  const [toDate, setToDate] = useState(todayStr);

  const [isExporting, setIsExporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const setPreset = (days: number) => {
    const end = new Date();
    const start = new Date(Date.now() - days * 86400000);
    setFromDate(start.toISOString().split("T")[0]);
    setToDate(end.toISOString().split("T")[0]);
    setErrorMsg(null);
  };

  const setThisMonth = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    setFromDate(start.toISOString().split("T")[0]);
    setToDate(now.toISOString().split("T")[0]);
    setErrorMsg(null);
  };

  const handleExport = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    // Validate date range for non-customer types
    if (selectedType !== "customers") {
      if (!fromDate || !toDate) {
        setErrorMsg("Please select both 'from' and 'to' dates.");
        return;
      }
      const start = new Date(fromDate);
      const end = new Date(toDate);
      if (end < start) {
        setErrorMsg("'To' date cannot be earlier than 'From' date.");
        return;
      }
      const diffDays = Math.round((end.getTime() - start.getTime()) / 86400000);
      if (diffDays > 366) {
        setErrorMsg(t("rangeExceeded"));
        return;
      }
    }

    setIsExporting(true);
    try {
      let url = `/exports/${selectedType}.xlsx`;
      if (selectedType !== "customers") {
        url += `?from=${fromDate}&to=${toDate}`;
      }
      const filename = `${selectedType}_${fromDate || "all"}_to_${toDate || todayStr}.xlsx`;

      await shareFile({
        url,
        filename,
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        dialogTitle: `Export ${selectedType}`,
      });

      setSuccessMsg(t("exportSuccess"));
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg(t("exportFailed"));
      }
    } finally {
      setIsExporting(false);
    }
  };

  if (!canExport) {
    return (
      <div className="flex-1 px-4 py-8 flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-neutral-900">Access Restricted</h2>
        <p className="text-xs text-neutral-500 max-w-xs">
          Exporting shop data requires the <code>data.export</code> permission (Owner or Manager role).
        </p>
        <Button variant="outline" size="sm" onClick={() => router.back()} className="text-xs">
          Go Back
        </Button>
      </div>
    );
  }

  const exportTypes: { id: ExportType; title: string; desc: string; icon: typeof Users }[] = [
    {
      id: "jobs",
      title: t("jobs"),
      desc: t("jobsDesc"),
      icon: Wrench,
    },
    {
      id: "customers",
      title: t("customers"),
      desc: t("customersDesc"),
      icon: Users,
    },
    {
      id: "invoices",
      title: t("invoices"),
      desc: t("invoicesDesc"),
      icon: Receipt,
    },
    {
      id: "payments",
      title: t("payments"),
      desc: t("paymentsDesc"),
      icon: CreditCard,
    },
  ];

  return (
    <div className="flex-1 px-4 py-4 space-y-4 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-9 h-9 rounded-xl bg-white border border-neutral-200/80 flex items-center justify-center text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100 transition-colors shrink-0 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-neutral-950 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <span>{t("title")}</span>
          </h1>
          <p className="text-xs text-neutral-500">{t("subtitle")}</p>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span className="flex-1">{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-rose-500 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span className="flex-1">{successMsg}</span>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-500 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Type Selection */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 px-1">
          {t("type")}
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {exportTypes.map((item) => {
            const Icon = item.icon;
            const isSelected = selectedType === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSelectedType(item.id);
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                  isSelected
                    ? "border-emerald-600 bg-emerald-50/50 shadow-sm ring-1 ring-emerald-500/20"
                    : "border-neutral-200 bg-white hover:bg-neutral-50"
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isSelected
                      ? "bg-emerald-600 text-white"
                      : "bg-neutral-100 text-neutral-600"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-neutral-900">{item.title}</p>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-0.5 leading-snug">
                    {item.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Date Range Selection (for Jobs, Invoices, Payments) */}
      {selectedType !== "customers" && (
        <div className="p-4 bg-white rounded-2xl border border-neutral-200/90 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {t("dateRange")}
            </span>
            <span className="text-[10px] text-neutral-400 font-medium">Max 366 days</span>
          </div>

          {/* Quick presets */}
          <div className="flex flex-wrap gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPreset(7)}
              className="text-[11px] h-7 px-2.5 rounded-lg border-neutral-200"
            >
              {t("last7Days")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPreset(30)}
              className="text-[11px] h-7 px-2.5 rounded-lg border-neutral-200"
            >
              {t("last30Days")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={setThisMonth}
              className="text-[11px] h-7 px-2.5 rounded-lg border-neutral-200"
            >
              {t("thisMonth")}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-neutral-600">
                {t("fromDate")}
              </label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-10 text-xs rounded-xl bg-neutral-50/50 border-neutral-200"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-neutral-600">
                {t("toDate")}
              </label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-10 text-xs rounded-xl bg-neutral-50/50 border-neutral-200"
              />
            </div>
          </div>
        </div>
      )}

      {/* Export Button */}
      <div className="pt-2">
        <Button
          type="button"
          disabled={isExporting}
          onClick={handleExport}
          className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2"
        >
          {isExporting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{t("exporting")}</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>{t("exportBtn")}</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
