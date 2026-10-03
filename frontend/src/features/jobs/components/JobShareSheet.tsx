"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import {
  FileText,
  Loader2,
  MessageCircle,
  Share2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePermission } from "@/lib/auth/store";
import { sharePdf } from "@/native/share";
import {
  isPhoneMasked,
  sendJobWhatsApp,
  type JobMessageData,
} from "@/features/messages/whatsapp";
import type { Job } from "@/features/jobs/api";

export interface JobShareSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: Job;
  shopName?: string;
}

export function JobShareSheet({
  open,
  onOpenChange,
  job,
  shopName = "Repair Shop",
}: JobShareSheetProps) {
  const tShare = useTranslations("share");
  const canSeePhone = usePermission("customers.see_phone");
  const [selectedSize, setSelectedSize] = useState<"a4" | "a5">("a4");
  const [isSharingPdf, setIsSharingPdf] = useState(false);

  const isCustomerPhoneMasked =
    Boolean(job.customer.phone_masked) ||
    isPhoneMasked(job.customer.phone) ||
    !canSeePhone;

  const deviceName = `${job.device.brand_name || ""} ${job.device.model}`.trim();
  const balancePaise =
    job.balance_paise ??
    Math.max(
      0,
      (job.total_paise && job.total_paise > 0
        ? job.total_paise
        : job.estimate_paise) - (job.paid_paise || 0)
    );

  const messageData: JobMessageData = {
    customerName: job.customer.name,
    shopName,
    jobNo: job.job_no,
    deviceName,
    balancePaise,
    trackingUrl: job.tracking_url,
  };

  const handleSharePdf = async () => {
    setIsSharingPdf(true);
    try {
      const url = `/jobs/${job.id}/receipt.pdf?size=${selectedSize}`;
      const filename = `JOB-${job.job_no}-receipt-${selectedSize}.pdf`;
      await sharePdf({
        url,
        filename,
        text: `Repair intake receipt for Job #${job.job_no}`,
        dialogTitle: `Job #${job.job_no} Receipt`,
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

  const handleWhatsApp = async (kind: "received" | "ready") => {
    try {
      await sendJobWhatsApp(
        job.customer.phone,
        kind,
        messageData,
        job.customer.preferred_locale
      );
      onOpenChange(false);
    } catch {
      toast.error(tShare("shareFailed"));
    }
  };

  const isReady = job.status === "ready_for_pickup" || job.status === "repaired";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl p-5 border border-neutral-200 dark:border-neutral-800 shadow-xl">
        <DialogHeader className="space-y-1 text-left pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                {tShare("shareTitle")}
              </DialogTitle>
              <p className="text-xs text-neutral-500 font-medium">
                Job #{job.job_no} • {deviceName}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 1. PDF Document Option */}
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-3.5 bg-neutral-50/60 dark:bg-neutral-900/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-600" />
                <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                  {tShare("shareReceipt")}
                </span>
              </div>

              {/* Paper Size Selector */}
              <div className="flex items-center bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 p-0.5 rounded-xl">
                <button
                  type="button"
                  onClick={() => setSelectedSize("a4")}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                    selectedSize === "a4"
                      ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-xs"
                      : "text-neutral-500 hover:text-neutral-900"
                  }`}
                >
                  A4
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSize("a5")}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                    selectedSize === "a5"
                      ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-xs"
                      : "text-neutral-500 hover:text-neutral-900"
                  }`}
                >
                  A5
                </button>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleSharePdf}
              disabled={isSharingPdf}
              className="w-full rounded-xl h-10 font-bold text-xs bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 shadow-sm"
            >
              {isSharingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                  <span>{tShare("preparingPdf")}</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 mr-2" />
                  <span>{tShare("shareReceipt")}</span>
                </>
              )}
            </Button>
          </div>

          {/* 2. WhatsApp Options (only when customer's phone is unmasked) */}
          {!isCustomerPhoneMasked && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 px-1">
                WhatsApp Updates
              </p>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => handleWhatsApp("received")}
                  className="w-full text-left p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <MessageCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-emerald-600 transition-colors">
                        {tShare("whatsAppJobReceived")}
                      </p>
                      <p className="text-[11px] text-neutral-500">
                        Intake receipt confirmation & tracking link
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleWhatsApp("ready")}
                  className={`w-full text-left p-3 rounded-2xl border transition-colors flex items-center justify-between group ${
                    isReady
                      ? "border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20"
                      : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-emerald-300"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isReady
                          ? "bg-emerald-600 text-white"
                          : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      <MessageCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-emerald-600 transition-colors">
                          {tShare("whatsAppReadyForPickup")}
                        </p>
                        {isReady && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                            <Sparkles className="w-2.5 h-2.5" />
                            Ready
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-500">
                        Device repaired notice with balance due
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
