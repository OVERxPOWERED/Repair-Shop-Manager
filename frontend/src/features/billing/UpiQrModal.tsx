"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import QRCode from "qrcode";
import { CheckCircle2, QrCode } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatPaise } from "@/lib/format/money";
import { buildUpiUri } from "@/lib/upi";

export interface UpiQrModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shopName: string;
  upiId: string;
  amountPaise: number;
  jobNo: number;
  onMarkAsPaid: () => void;
}

export function UpiQrModal({
  open,
  onOpenChange,
  shopName,
  upiId,
  amountPaise,
  jobNo,
  onMarkAsPaid,
}: UpiQrModalProps) {
  const t = useTranslations("billing");
  const [qrUrl, setQrUrl] = useState<string>("");

  useEffect(() => {
    if (open && upiId && amountPaise > 0) {
      const uri = buildUpiUri({
        vpa: upiId,
        payeeName: shopName,
        amountPaise,
        note: `Job #${jobNo}`,
      });

      QRCode.toDataURL(uri, {
        width: 280,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      })
        .then(setQrUrl)
        .catch((err) => {
          console.error("QR Code generation error:", err);
        });
    }
  }, [open, upiId, amountPaise, shopName, jobNo]);

  const handleMarkPaid = () => {
    onOpenChange(false);
    onMarkAsPaid();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl p-6 text-center">
        <DialogHeader className="items-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mb-1">
            <QrCode className="w-6 h-6" />
          </div>
          <DialogTitle className="text-lg font-bold">
            {t("upiQr.title")}
          </DialogTitle>
          <p className="text-xs text-neutral-500 font-medium">{shopName} ({upiId})</p>
        </DialogHeader>

        {/* Large Amount */}
        <div className="my-2">
          <div className="text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
            {formatPaise(amountPaise)}
          </div>
          <div className="text-xs font-semibold text-neutral-400 mt-0.5">
            {t("upiQr.jobRef", { jobNo })}
          </div>
        </div>

        {/* QR Code Container */}
        <div className="flex justify-center my-2 p-2 bg-white rounded-2xl shadow-sm border border-neutral-100 dark:border-neutral-800">
          {qrUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrUrl}
              alt="UPI QR Code"
              className="w-56 h-56 rounded-xl select-none"
            />
          ) : (
            <div className="w-56 h-56 flex items-center justify-center text-neutral-300">
              {t("common.loading")}
            </div>
          )}
        </div>

        <p className="text-xs text-neutral-500 font-medium px-4">
          {t("upiQr.scanCaption")}
        </p>

        {/* Action Button */}
        <div className="pt-2">
          <Button
            onClick={handleMarkPaid}
            className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center justify-center gap-2 shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4" />
            {t("upiQr.markAsPaid")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
