"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, MoreVertical, Trash2, Edit2, QrCode, CreditCard, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPaise } from "@/lib/format/money";
import { usePermission } from "@/lib/auth/store";
import {
  useJobLineItems,
  useDeleteLineItem,
  type JobLineItem,
} from "@/features/billing/api";
import type { Job } from "../api";

export interface RepairDetailsSectionProps {
  job: Job;
  canEdit: boolean;
  onOpenAddLineItem: () => void;
  onEditLineItem: (item: JobLineItem) => void;
  onOpenPayment: () => void;
  onOpenUpiQr: () => void;
  shopUpiId?: string | null;
}

export function RepairDetailsSection({
  job,
  canEdit,
  onOpenAddLineItem,
  onEditLineItem,
  onOpenPayment,
  onOpenUpiQr,
  shopUpiId,
}: RepairDetailsSectionProps) {
  const t = useTranslations("billing");
  const canSeeCost = usePermission("money.see_cost_profit");
  const canRecordPayment = usePermission("payments.record");

  const { data: lineItems = [], isLoading } = useJobLineItems(job.id);
  const deleteMutation = useDeleteLineItem(job.id);

  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const isLockedOrInvoiced = job.is_locked; // In Phase 1, delivery/cancellation locks job
  const canModifyItems = canEdit && !isLockedOrInvoiced;

  const totalPaise = job.total_paise ?? 0;
  const displayTotal = totalPaise > 0 ? totalPaise : job.estimate_paise;
  const paidPaise = job.paid_paise ?? 0;
  const balancePaise = job.balance_paise ?? Math.max(0, displayTotal - paidPaise);

  const handleDelete = async (item: JobLineItem) => {
    setActiveMenuId(null);
    if (!window.confirm(t("lineItems.deleteConfirm", { description: item.description }))) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(item.id);
      toast.success(t("lineItems.deletedSuccess"));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("lineItems.deleteFailed");
      toast.error(msg);
    }
  };

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
            {t("repairDetails.title")}
          </h3>
          <p className="text-xs text-neutral-500 font-medium">
            {t("repairDetails.subtitle")}
          </p>
        </div>

        {canModifyItems ? (
          <Button
            size="sm"
            onClick={onOpenAddLineItem}
            className="h-9 rounded-xl gap-1.5 font-semibold text-xs bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
          >
            <Plus className="w-3.5 h-3.5" />
            {t("lineItems.addButton")}
          </Button>
        ) : isLockedOrInvoiced ? (
          <Badge variant="outline" className="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800">
            {t("lineItems.jobLocked")}
          </Badge>
        ) : null}
      </div>

      {/* Line Items List */}
      <div className="divide-y divide-neutral-100 dark:divide-neutral-800/80">
        {isLoading ? (
          <div className="py-6 text-center text-xs text-neutral-400">
            {t("common.loading")}
          </div>
        ) : lineItems.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-xs text-neutral-400 font-medium">
              {t("lineItems.emptyState")}
            </p>
          </div>
        ) : (
          lineItems.map((item) => (
            <div
              key={item.id}
              className="py-3 flex items-start justify-between gap-3 text-sm relative group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                    {t(`lineItems.kinds.${item.kind}`)}
                  </span>
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                    {item.description}
                  </span>
                </div>

                <div className="text-xs text-neutral-500 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span>
                    {item.quantity} × {formatPaise(item.unit_price_paise)}
                  </span>
                  {item.discount_paise > 0 && (
                    <span className="text-emerald-600 font-medium">
                      -{formatPaise(item.discount_paise)}
                    </span>
                  )}
                  {canSeeCost && item.unit_cost_paise !== undefined && item.unit_cost_paise > 0 && (
                    <span className="text-neutral-400 text-[11px]">
                      ({t("lineItems.costPrefix")}: {formatPaise(item.unit_cost_paise)})
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="font-bold text-neutral-900 dark:text-white">
                  {formatPaise(item.line_total_paise)}
                </div>

                {canModifyItems && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() =>
                        setActiveMenuId(activeMenuId === item.id ? null : item.id)
                      }
                      className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {activeMenuId === item.id && (
                      <div className="absolute right-0 top-7 w-32 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-lg p-1 z-20 flex flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuId(null);
                            onEditLineItem(item);
                          }}
                          className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-left"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          {t("common.edit")}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg text-left"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {t("common.delete")}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Totals & Dues Card */}
      <div className="bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl p-4 space-y-2 border border-neutral-100 dark:border-neutral-800">
        <div className="flex justify-between items-center text-xs text-neutral-500 font-medium">
          <span>{totalPaise > 0 ? t("repairDetails.subtotal") : t("repairDetails.estimatedTotal")}</span>
          <span className="font-semibold text-neutral-800 dark:text-neutral-200">
            {formatPaise(displayTotal)}
          </span>
        </div>

        <div className="flex justify-between items-center text-xs text-neutral-500 font-medium">
          <span>{t("repairDetails.amountPaid")}</span>
          <span className="font-semibold text-neutral-800 dark:text-neutral-200">
            {formatPaise(paidPaise)}
          </span>
        </div>

        <div className="pt-2 border-t border-neutral-200/80 dark:border-neutral-700 flex justify-between items-center">
          <span className="text-sm font-bold text-neutral-900 dark:text-white">
            {t("repairDetails.balanceDue")}
          </span>
          <span
            className={`text-base font-extrabold ${
              balancePaise > 0
                ? "text-rose-600 dark:text-rose-400"
                : "text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {formatPaise(balancePaise)}
          </span>
        </div>
      </div>

      {/* Payment & UPI Quick Actions */}
      <div className="flex gap-2 pt-1">
        {canRecordPayment && (
          <Button
            type="button"
            onClick={onOpenPayment}
            className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5 shadow-sm"
          >
            <CreditCard className="w-4 h-4" />
            {t("payment.recordButton")}
          </Button>
        )}

        {Boolean(shopUpiId) && balancePaise > 0 && (
          <Button
            type="button"
            variant="outline"
            onClick={onOpenUpiQr}
            className="h-11 px-4 rounded-xl border-neutral-200 dark:border-neutral-700 font-semibold text-xs gap-1.5"
          >
            <QrCode className="w-4 h-4 text-emerald-600" />
            {t("upiQr.buttonLabel")}
          </Button>
        )}
      </div>
    </div>
  );
}
