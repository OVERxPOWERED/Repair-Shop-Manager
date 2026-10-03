"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Building2, User, Phone, MapPin, Receipt, ShieldAlert, CheckCircle2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatPaise } from "@/lib/format/money";
import { formatDate } from "@/lib/format/date";
import { amountInWords } from "@/lib/format/amount-words";
import { GST_STATE_MAP } from "@/lib/constants/gst-states";
import { useLocaleStore } from "@/i18n/store";
import type { Invoice } from "../api";

export interface InvoicePreviewProps {
  invoice: Invoice;
  shopName?: string;
  shopGstin?: string;
  shopAddress?: string;
  shopPhone?: string;
}

export function InvoicePreview({
  invoice,
  shopName,
  shopGstin,
  shopAddress,
  shopPhone,
}: InvoicePreviewProps) {
  const t = useTranslations("invoices");
  const locale = useLocaleStore((s) => s.locale);

  // If issued or cancelled, use the immutable snapshots; otherwise live props
  const snapshotShop = (invoice.shop_snapshot || {}) as Record<string, string>;
  const snapshotCustomer = (invoice.customer_snapshot || {}) as Record<string, string>;

  const effectiveShopName = snapshotShop.name || shopName || "Repair Shop";
  const effectiveShopGstin = snapshotShop.gstin || shopGstin || "";
  const effectiveShopAddress = snapshotShop.address || shopAddress || "";
  const effectiveShopPhone = snapshotShop.phone || shopPhone || "";

  const effectiveCustomerName = snapshotCustomer.name || t("walkInCustomer");
  const effectiveCustomerPhone = snapshotCustomer.phone || "";
  const effectiveCustomerGstin = invoice.customer_gstin || snapshotCustomer.gstin || "";

  const isGst = Boolean(effectiveShopGstin) || invoice.kind === "tax_invoice" || invoice.kind === "bill_of_supply";
  const isInterState = invoice.igst_paise > 0;
  const posName = GST_STATE_MAP[invoice.place_of_supply_state] || invoice.place_of_supply_state;

  const kindTitles: Record<string, string> = {
    tax_invoice: t("kinds.taxInvoice"),
    bill_of_supply: t("kinds.billOfSupply"),
    simple_bill: t("kinds.simpleBill"),
    credit_note: t("kinds.creditNote"),
  };

  const invoiceTitle = kindTitles[invoice.kind] || t("kinds.taxInvoice");

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-5 sm:p-7 shadow-sm space-y-6">
      {/* 1. Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-neutral-100 dark:border-neutral-800">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
            {invoiceTitle}
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight mt-0.5">
            {invoice.number_display || t("draftInvoice")}
          </h2>
          {invoice.issue_date && (
            <p className="text-xs text-neutral-500 font-medium mt-1">
              {t("issueDate")}: <span className="font-semibold text-neutral-700 dark:text-neutral-300">{formatDate(invoice.issue_date, locale)}</span>
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {invoice.status === "draft" && (
            <Badge className="bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200 text-xs px-2.5 py-1 font-bold uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5 mr-1" />
              {t("statuses.draft")}
            </Badge>
          )}
          {invoice.status === "issued" && (
            <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 text-xs px-2.5 py-1 font-bold uppercase tracking-wider">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              {t("statuses.issued")}
            </Badge>
          )}
          {invoice.status === "cancelled" && (
            <Badge className="bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950 dark:text-rose-200 text-xs px-2.5 py-1 font-bold uppercase tracking-wider">
              <ShieldAlert className="w-3.5 h-3.5 mr-1" />
              {t("statuses.cancelled")}
            </Badge>
          )}
        </div>
      </div>

      {/* 2. Shop & Bill To Information */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
        {/* Shop Info */}
        <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-neutral-900 dark:text-neutral-100 text-sm">
            <Building2 className="w-4 h-4 text-neutral-500 shrink-0" />
            <span>{effectiveShopName}</span>
          </div>
          {effectiveShopGstin && (
            <p className="text-neutral-600 dark:text-neutral-400">
              <span className="font-semibold text-neutral-500">GSTIN:</span> {effectiveShopGstin}
            </p>
          )}
          {effectiveShopAddress && (
            <p className="text-neutral-600 dark:text-neutral-400 flex items-start gap-1">
              <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
              <span>{effectiveShopAddress}</span>
            </p>
          )}
          {effectiveShopPhone && (
            <p className="text-neutral-600 dark:text-neutral-400 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <span>+91 {effectiveShopPhone}</span>
            </p>
          )}
        </div>

        {/* Customer / Bill To Info */}
        <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 space-y-1.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
            {t("billTo")}
          </div>
          <div className="flex items-center gap-1.5 font-bold text-neutral-900 dark:text-neutral-100 text-sm">
            <User className="w-4 h-4 text-neutral-500 shrink-0" />
            <span>{effectiveCustomerName}</span>
          </div>
          {effectiveCustomerPhone && (
            <p className="text-neutral-600 dark:text-neutral-400 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <span>+91 {effectiveCustomerPhone}</span>
            </p>
          )}
          {effectiveCustomerGstin && (
            <p className="text-neutral-600 dark:text-neutral-400">
              <span className="font-semibold text-neutral-500">GSTIN:</span> {effectiveCustomerGstin}
            </p>
          )}
          {invoice.place_of_supply_state && (
            <p className="text-neutral-600 dark:text-neutral-400">
              <span className="font-semibold text-neutral-500">{t("placeOfSupply")}:</span>{" "}
              {invoice.place_of_supply_state} - {posName}
            </p>
          )}
        </div>
      </div>

      {/* 3. Line Items Table */}
      <div className="overflow-x-auto -mx-2 sm:mx-0">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-neutral-200 dark:border-neutral-800 text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              <th className="py-2 px-2">#</th>
              <th className="py-2 px-2">{t("tableItem")}</th>
              {isGst && <th className="py-2 px-2">{t("tableHsn")}</th>}
              <th className="py-2 px-2 text-right">{t("tableQty")}</th>
              <th className="py-2 px-2 text-right">{t("tableRate")}</th>
              <th className="py-2 px-2 text-right">{t("tableDisc")}</th>
              {isGst && <th className="py-2 px-2 text-right">{t("tableTax")}</th>}
              <th className="py-2 px-2 text-right">{t("tableTotal")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-medium">
            {invoice.lines.map((line, idx) => (
              <tr key={line.id || idx} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                <td className="py-2.5 px-2 text-neutral-400">{idx + 1}</td>
                <td className="py-2.5 px-2 font-semibold text-neutral-900 dark:text-neutral-100">
                  {line.description}
                </td>
                {isGst && <td className="py-2.5 px-2 text-neutral-500 font-mono">{line.hsn_sac || "—"}</td>}
                <td className="py-2.5 px-2 text-right tabular-nums">{line.quantity}</td>
                <td className="py-2.5 px-2 text-right tabular-nums">{formatPaise(line.unit_price_paise)}</td>
                <td className="py-2.5 px-2 text-right tabular-nums text-neutral-500">
                  {line.discount_paise > 0 ? formatPaise(line.discount_paise) : "—"}
                </td>
                {isGst && (
                  <td className="py-2.5 px-2 text-right tabular-nums text-neutral-500">
                    {line.tax_rate_bp > 0 ? `${line.tax_rate_bp / 100}%` : "0%"}
                  </td>
                )}
                <td className="py-2.5 px-2 text-right tabular-nums font-bold text-neutral-900 dark:text-neutral-100">
                  {formatPaise(line.line_total_paise)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 4. Tax Breakdown & Financial Totals */}
      <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row justify-between gap-6">
        {/* Amount in words and Notes */}
        <div className="flex-1 space-y-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              {t("amountInWords")}
            </span>
            <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 italic mt-0.5">
              {amountInWords(invoice.total_paise)}
            </p>
          </div>

          {invoice.notes && (
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                {t("notes")}
              </span>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap mt-0.5">
                {invoice.notes}
              </p>
            </div>
          )}

          {invoice.terms && (
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                {t("terms")}
              </span>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-500 whitespace-pre-wrap mt-0.5">
                {invoice.terms}
              </p>
            </div>
          )}
        </div>

        {/* Calculation Summary Table */}
        <div className="w-full sm:w-72 space-y-1.5 text-xs">
          <div className="flex justify-between py-1 text-neutral-500">
            <span>{t("subtotal")}:</span>
            <span className="font-semibold text-neutral-800 dark:text-neutral-200 tabular-nums">
              {formatPaise(invoice.subtotal_paise)}
            </span>
          </div>

          {invoice.discount_paise > 0 && (
            <div className="flex justify-between py-1 text-neutral-500">
              <span>{t("discount")}:</span>
              <span className="font-semibold text-rose-600 tabular-nums">
                -{formatPaise(invoice.discount_paise)}
              </span>
            </div>
          )}

          {isGst && (
            <>
              <div className="flex justify-between py-1 text-neutral-500">
                <span>{t("taxableAmount")}:</span>
                <span className="font-semibold text-neutral-800 dark:text-neutral-200 tabular-nums">
                  {formatPaise(invoice.taxable_paise)}
                </span>
              </div>

              {!isInterState ? (
                <>
                  <div className="flex justify-between py-1 text-neutral-500">
                    <span>{t("cgst")}:</span>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200 tabular-nums">
                      {formatPaise(invoice.cgst_paise)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 text-neutral-500">
                    <span>{t("sgst")}:</span>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200 tabular-nums">
                      {formatPaise(invoice.sgst_paise)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between py-1 text-neutral-500">
                  <span>{t("igst")}:</span>
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200 tabular-nums">
                    {formatPaise(invoice.igst_paise)}
                  </span>
                </div>
              )}
            </>
          )}

          {invoice.round_off_paise !== 0 && (
            <div className="flex justify-between py-1 text-neutral-500">
              <span>{t("roundOff")}:</span>
              <span className="font-semibold text-neutral-800 dark:text-neutral-200 tabular-nums">
                {invoice.round_off_paise > 0 ? "+" : ""}
                {formatPaise(invoice.round_off_paise)}
              </span>
            </div>
          )}

          <div className="flex justify-between py-2 border-t border-neutral-200 dark:border-neutral-800 text-sm font-black text-neutral-900 dark:text-neutral-100">
            <span>{t("grandTotal")}:</span>
            <span className="tabular-nums">{formatPaise(invoice.total_paise)}</span>
          </div>

          <div className="flex justify-between py-1 text-emerald-700 dark:text-emerald-400 font-semibold">
            <span>{t("amountPaid")}:</span>
            <span className="tabular-nums">{formatPaise(invoice.amount_paid_paise)}</span>
          </div>

          <div className="flex justify-between py-1 text-neutral-900 dark:text-neutral-100 font-bold border-t border-dashed border-neutral-200 dark:border-neutral-800">
            <span>{t("balanceDue")}:</span>
            <span className={`tabular-nums ${invoice.balance_paise > 0 ? "text-rose-600 dark:text-rose-400" : ""}`}>
              {formatPaise(invoice.balance_paise)}
            </span>
          </div>
        </div>
      </div>

      {/* 5. Footer */}
      <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 text-center text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
        {t("computerGeneratedDoc")}
      </div>
    </div>
  );
}
