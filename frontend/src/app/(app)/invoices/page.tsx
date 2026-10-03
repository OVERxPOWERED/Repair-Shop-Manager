"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Search,
  Receipt,
  Clock,
  CheckCircle2,
  ShieldAlert,
  FileText,
  Filter,
  ArrowRight,
  Plus,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useInvoices, type InvoiceKind, type InvoiceStatus, type Invoice } from "@/features/invoices/api";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatPaise } from "@/lib/format/money";
import { formatDate } from "@/lib/format/date";
import { useLocaleStore } from "@/i18n/store";

function InvoicesListContent() {
  const t = useTranslations("invoices");
  const router = useRouter();
  const locale = useLocaleStore((s) => s.locale);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedKind, setSelectedKind] = useState<string>("all");

  const queryParams = {
    q: searchTerm.trim() || undefined,
    status: selectedStatus !== "all" ? selectedStatus : undefined,
    kind: (selectedKind !== "all" ? selectedKind : undefined) as InvoiceKind | undefined,
  };

  const { data: invoices = [], isLoading } = useInvoices(queryParams);

  const statusOptions = [
    { label: t("filters.all"), value: "all" },
    { label: t("statuses.draft"), value: "draft" },
    { label: t("statuses.issued"), value: "issued" },
    { label: t("statuses.cancelled"), value: "cancelled" },
  ];

  const kindOptions = [
    { label: t("filters.allKinds"), value: "all" },
    { label: t("kinds.taxInvoice"), value: "tax_invoice" },
    { label: t("kinds.billOfSupply"), value: "bill_of_supply" },
    { label: t("kinds.simpleBill"), value: "simple_bill" },
    { label: t("kinds.creditNote"), value: "credit_note" },
  ];

  return (
    <div className="flex-1 px-4 py-4 space-y-4 max-w-2xl mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/more/")}
            className="p-1 -ml-1 text-neutral-600 hover:text-neutral-900 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight">
              {t("listTitle")}
            </h1>
            <p className="text-xs text-neutral-500 font-medium">
              {t("listSubtitle")}
            </p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="pl-10 h-11 rounded-2xl bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-xs shadow-sm"
        />
      </div>

      {/* Status Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {statusOptions.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setSelectedStatus(opt.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedStatus === opt.value
                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-sm"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Kind Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {kindOptions.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setSelectedKind(opt.value)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors border ${
              selectedKind === opt.value
                ? "border-neutral-900 bg-neutral-900/5 text-neutral-950 font-bold dark:border-white dark:text-white"
                : "border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Invoices List */}
      <div className="space-y-2.5 pt-1">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        ) : invoices.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                {t("emptyInvoicesTitle")}
              </p>
              <p className="text-xs text-neutral-500 mt-0.5">
                {t("emptyInvoicesSubtitle")}
              </p>
            </div>
          </div>
        ) : (
          invoices.map((inv) => {
            const customerSnapshot = (inv.customer_snapshot || {}) as Record<string, string>;
            const customerName = customerSnapshot.name || t("walkInCustomer");
            const customerPhone = customerSnapshot.phone || "";

            return (
              <div
                key={inv.id}
                onClick={() => router.push(`/invoices/detail/?id=${inv.id}`)}
                className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 shadow-sm hover:border-neutral-400 transition-all cursor-pointer space-y-2.5"
              >
                {/* Top Row: Number, Date, Status */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-neutral-900 dark:text-neutral-100 font-mono tracking-tight">
                      {inv.number_display || t("draftInvoice")}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0"
                    >
                      {t(`kinds.${inv.kind}` as any) || inv.kind}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {inv.status === "draft" && (
                      <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-[10px] font-bold px-1.5 py-0">
                        {t("statuses.draft")}
                      </Badge>
                    )}
                    {inv.status === "issued" && (
                      <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-bold px-1.5 py-0">
                        {t("statuses.issued")}
                      </Badge>
                    )}
                    {inv.status === "cancelled" && (
                      <Badge className="bg-rose-50 text-rose-800 border-rose-200 text-[10px] font-bold px-1.5 py-0">
                        {t("statuses.cancelled")}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Customer & Issue Date */}
                <div className="flex items-center justify-between text-xs">
                  <div className="min-w-0">
                    <p className="font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                      {customerName}
                    </p>
                    {customerPhone && (
                      <p className="text-[11px] text-neutral-400 font-mono mt-0.5">
                        +91 {customerPhone}
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="text-[11px] text-neutral-400">
                      {inv.issue_date ? formatDate(inv.issue_date, locale) : formatDate(inv.created_at, locale)}
                    </p>
                  </div>
                </div>

                {/* Bottom Row: Total & Balance */}
                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-400">{t("grandTotal")}:</span>
                    <span className="font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
                      {formatPaise(inv.total_paise)}
                    </span>
                  </div>

                  {inv.status !== "draft" && (
                    <div className="flex items-center gap-1">
                      <span className="text-neutral-400">{t("balanceDue")}:</span>
                      <span
                        className={`font-bold tabular-nums ${
                          inv.balance_paise > 0
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {formatPaise(inv.balance_paise)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function InvoicesListPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex-1 p-4 space-y-4 max-w-2xl mx-auto">
          <Skeleton className="h-10 w-32 rounded-xl" />
          <Skeleton className="h-12 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
        </div>
      }
    >
      <InvoicesListContent />
    </React.Suspense>
  );
}
