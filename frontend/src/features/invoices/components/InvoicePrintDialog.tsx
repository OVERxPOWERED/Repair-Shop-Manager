"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  FileText,
  Loader2,
  Printer,
  Share2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Invoice } from "@/features/invoices/api";
import type { CurrentShopDetails } from "@/features/billing/api";
import { invoiceReceiptModel } from "@/lib/printer/receipt";
import { printReceipt } from "@/lib/printer/render-canvas";
import {
  getPrinterService,
  getStoredPrinterConfig,
  PrinterError,
} from "@/native/printer";
import { isNative } from "@/native/platform";
import { sharePdf } from "@/native/share";

export interface InvoicePrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice;
  shop?: CurrentShopDetails | null;
}

export function InvoicePrintDialog({
  open,
  onOpenChange,
  invoice,
  shop,
}: InvoicePrintDialogProps) {
  const router = useRouter();
  const tShare = useTranslations("share");
  const tPrinter = useTranslations("printer");
  const tInvoices = useTranslations("invoices");

  const [thermalWidth, setThermalWidth] = useState<58 | 80>(58);
  const [isPrintingThermal, setIsPrintingThermal] = useState(false);
  const [isSharingPdf, setIsSharingPdf] = useState(false);

  useEffect(() => {
    getStoredPrinterConfig().then((cfg) => {
      if (cfg.paperWidth) setThermalWidth(cfg.paperWidth);
    });
  }, []);

  const handlePrintThermal = async () => {
    setIsPrintingThermal(true);
    try {
      const model = invoiceReceiptModel(invoice, shop);
      if (isNative() || getPrinterService().isConnected()) {
        await printReceipt(model, { paperWidth: thermalWidth });
        toast.success(tPrinter("printSuccess"));
        onOpenChange(false);
      } else {
        router.push(`/print/receipt/?type=invoice&id=${invoice.id}&size=${thermalWidth}`);
        onOpenChange(false);
      }
    } catch (err: unknown) {
      if (err instanceof PrinterError && err.reason === "not_found") {
        toast.error(tPrinter("notConfiguredError"));
      } else {
        const msg = err instanceof Error ? err.message : tPrinter("printFailed");
        toast.error(msg);
      }
    } finally {
      setIsPrintingThermal(false);
    }
  };

  const handleSharePdf = async () => {
    setIsSharingPdf(true);
    try {
      const safeNumber = (invoice.number_display || "invoice").replace(/[^a-zA-Z0-9_-]/g, "_");
      await sharePdf({
        url: `/invoices/${invoice.id}/pdf/`,
        filename: `${safeNumber}.pdf`,
        text: `Invoice ${invoice.number_display || ""}`,
        dialogTitle: `${invoice.number_display || "Invoice"} PDF`,
      });
      toast.success(tShare("shareSuccess"));
      onOpenChange(false);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      toast.error(tShare("shareFailed"));
    } finally {
      setIsSharingPdf(false);
    }
  };

  const handleBrowserPrint = () => {
    onOpenChange(false);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl p-5 border border-neutral-200 dark:border-neutral-800 shadow-xl">
        <DialogHeader className="space-y-1 text-left pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 flex items-center justify-center">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                {tPrinter("title")}
              </DialogTitle>
              <p className="text-xs text-neutral-500 font-medium">
                {invoice.number_display || "Invoice"}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 1. Thermal POS Receipt Option */}
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-3.5 bg-neutral-50/60 dark:bg-neutral-900/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                  {tPrinter("printThermalReceipt")}
                </span>
              </div>

              {/* Paper Size Selector (58mm / 80mm) */}
              <div className="flex items-center bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 p-0.5 rounded-xl">
                <button
                  type="button"
                  onClick={() => setThermalWidth(58)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                    thermalWidth === 58
                      ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-xs"
                      : "text-neutral-500 hover:text-neutral-900"
                  }`}
                >
                  58mm
                </button>
                <button
                  type="button"
                  onClick={() => setThermalWidth(80)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                    thermalWidth === 80
                      ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-xs"
                      : "text-neutral-500 hover:text-neutral-900"
                  }`}
                >
                  80mm
                </button>
              </div>
            </div>

            <Button
              type="button"
              onClick={handlePrintThermal}
              disabled={isPrintingThermal}
              className="w-full rounded-xl h-10 font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              {isPrintingThermal ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                  <span>{tPrinter("printingTestBtn")}</span>
                </>
              ) : (
                <>
                  <Printer className="w-3.5 h-3.5 mr-2" />
                  <span>{tPrinter("printThermalBtn")}</span>
                </>
              )}
            </Button>
          </div>

          {/* 2. PDF Document Option */}
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-3.5 bg-neutral-50/60 dark:bg-neutral-900/60 space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-600" />
              <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                {tShare("sharePdf")}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleSharePdf}
                disabled={isSharingPdf}
                className="rounded-xl h-10 font-bold text-xs border-neutral-300 dark:border-neutral-700"
              >
                {isSharingPdf ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Share2 className="w-3.5 h-3.5 mr-1.5" />
                )}
                <span>{tShare("sharePdf")}</span>
              </Button>

              <Button
                type="button"
                onClick={handleBrowserPrint}
                className="rounded-xl h-10 font-bold text-xs bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 shadow-sm"
              >
                <Printer className="w-3.5 h-3.5 mr-1.5" />
                <span>{tInvoices("printBtn")} (A4)</span>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
