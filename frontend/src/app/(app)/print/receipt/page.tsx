"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import QRCode from "qrcode";
import { Printer, ChevronLeft, Loader2 } from "lucide-react";

import { useJob } from "@/features/jobs/api";
import { useInvoice } from "@/features/invoices/api";
import { useCurrentShopDetails, useJobPayments } from "@/features/billing/api";
import { Button } from "@/components/ui/button";
import {
  jobReceiptModel,
  invoiceReceiptModel,
  paymentReceiptModel,
  testReceiptModel,
  type ReceiptModel,
} from "@/lib/printer/receipt";

function ReceiptPrintContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get("type") || "test";
  const id = searchParams.get("id");
  const jobId = searchParams.get("job_id");
  const sizeParam = searchParams.get("size") || "58";
  const paperWidth = sizeParam === "80" ? 80 : 58;

  const { data: job, isLoading: isLoadingJob } = useJob(
    type === "job" ? id : type === "payment" ? jobId : null
  );
  const { data: invoice, isLoading: isLoadingInvoice } = useInvoice(type === "invoice" ? id : null);
  const { data: paymentsSummary, isLoading: isLoadingPayments } = useJobPayments(
    type === "payment" ? (jobId || undefined) : undefined
  );
  const { data: currentShop } = useCurrentShopDetails();

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  let model: ReceiptModel | null = null;
  if (type === "job" && job) {
    model = jobReceiptModel(job, currentShop);
  } else if (type === "invoice" && invoice) {
    model = invoiceReceiptModel(invoice, currentShop);
  } else if (type === "payment" && job) {
    const payment = paymentsSummary?.items?.find((p) => p.id === id) || paymentsSummary?.items?.[0];
    if (payment) {
      model = paymentReceiptModel(
        { job_no: job.job_no, device: job.device },
        payment,
        currentShop,
        job.balance_paise ?? 0
      );
    }
  } else if (type === "test") {
    model = testReceiptModel(currentShop);
  }

  // Generate QR code data URL
  useEffect(() => {
    if (model?.qr?.data) {
      QRCode.toDataURL(model.qr.data, { width: 140, margin: 1 })
        .then(setQrDataUrl)
        .catch(() => setQrDataUrl(null));
    }
  }, [model?.qr?.data]);

  // Trigger print dialog once loaded
  useEffect(() => {
    if (model && (typeof window !== "undefined")) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [model]);

  if (
    (type === "job" && isLoadingJob) ||
    (type === "invoice" && isLoadingInvoice) ||
    (type === "payment" && (isLoadingJob || isLoadingPayments))
  ) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
        <p className="text-xs text-neutral-500">Generating receipt...</p>
      </div>
    );
  }

  if (!model) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-sm font-bold text-neutral-800">Receipt data not found</p>
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  const containerWidthClass = paperWidth === 80 ? "max-w-[72mm]" : "max-w-[48mm]";

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 p-4 print:p-0 print:bg-white text-neutral-900">
      {/* On-screen controls (hidden when printing) */}
      <div className="max-w-md mx-auto mb-4 print:hidden flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1 text-xs font-semibold text-neutral-600 hover:text-neutral-900"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <Button
          type="button"
          size="sm"
          onClick={() => window.print()}
          className="rounded-xl text-xs h-8 gap-1.5 font-bold bg-neutral-900 text-white"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print Receipt</span>
        </Button>
      </div>

      {/* Printable Thermal Receipt Card */}
      <div
        className={`mx-auto bg-white p-3 shadow-md print:shadow-none print:m-0 print:p-1 font-mono text-[11px] leading-tight ${containerWidthClass}`}
        style={{
          fontFamily: "'Noto Sans', 'Noto Sans Devanagari', monospace",
        }}
      >
        <style dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: ${paperWidth}mm auto;
                margin: 0;
              }
              body {
                margin: 0;
                background: white !important;
                color: black !important;
              }
            }
          `
        }} />

        {/* Title & Header */}
        <div className="text-center space-y-0.5 pb-2">
          <p className="font-bold text-xs uppercase tracking-wider">{model.title}</p>
          <p className="font-extrabold text-sm">{model.header.shopName}</p>
          {model.header.shopAddress && <p className="text-[10px]">{model.header.shopAddress}</p>}
          {model.header.shopPhone && <p className="text-[10px]">Ph: +91 {model.header.shopPhone}</p>}
          {model.header.shopGstin && <p className="text-[10px]">GSTIN: {model.header.shopGstin}</p>}
        </div>

        <div className="border-t border-dashed border-neutral-400 my-1.5" />

        {/* Document Number & Date */}
        <div className="flex justify-between items-center text-[10px] py-0.5">
          <span className="font-bold">{model.header.documentNumber}</span>
          <span>{model.header.date}</span>
        </div>

        {model.header.customerName && (
          <div className="flex justify-between items-center text-[10px] py-0.5">
            <span>Customer: {model.header.customerName}</span>
            {model.header.customerPhone && <span>{model.header.customerPhone}</span>}
          </div>
        )}

        <div className="border-t border-dashed border-neutral-400 my-1.5" />

        {/* Receipt Lines */}
        <div className="space-y-1">
          {model.lines.map((line, idx) => {
            if (line.separator) {
              return <div key={idx} className="border-t border-dashed border-neutral-400 my-1.5" />;
            }

            if (line.align === "center") {
              return (
                <div key={idx} className={`text-center ${line.bold ? "font-bold text-xs" : ""}`}>
                  {line.left}
                </div>
              );
            }

            return (
              <div
                key={idx}
                className={`flex justify-between items-start gap-1 ${
                  line.bold ? "font-bold text-xs" : ""
                }`}
              >
                <span className="break-words flex-1">{line.left}</span>
                {line.right && <span className="tabular-nums shrink-0">{line.right}</span>}
              </div>
            );
          })}
        </div>

        {/* QR Code */}
        {qrDataUrl && (
          <div className="pt-3 pb-1 text-center flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="Receipt QR Code" className="w-28 h-28 mx-auto" />
            {model.qr?.caption && (
              <p className="text-[9px] text-neutral-500 mt-1">{model.qr.caption}</p>
            )}
          </div>
        )}

        {/* Footer */}
        {model.footer && model.footer.length > 0 && (
          <div className="pt-2 text-center text-[9px] text-neutral-600 space-y-0.5">
            <div className="border-t border-dashed border-neutral-400 my-1.5" />
            {model.footer.map((f, idx) => (
              <p key={idx}>{f}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReceiptPrintPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
        </div>
      }
    >
      <ReceiptPrintContent />
    </React.Suspense>
  );
}
