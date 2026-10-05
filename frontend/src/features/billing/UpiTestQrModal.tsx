"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import QRCode from "qrcode";
import { QrCode, CheckCircle2, Smartphone, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { buildUpiUri } from "@/lib/upi";

export interface UpiTestQrModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shopName: string;
  upiId: string;
}

export function UpiTestQrModal({
  open,
  onOpenChange,
  shopName,
  upiId,
}: UpiTestQrModalProps) {
  const t = useTranslations("billing");
  const [qrUrl, setQrUrl] = useState<string>("");

  useEffect(() => {
    if (open && upiId) {
      // NPCI standard URI with 1.00 INR test amount (no real transfer needed)
      const uri = buildUpiUri({
        vpa: upiId.trim(),
        payeeName: (shopName || "FixPro Partner").slice(0, 50),
        amountPaise: 100,
        note: "FixPro UPI Verification",
      });

      QRCode.toDataURL(uri, {
        width: 260,
        margin: 2,
        color: {
          dark: "#09090b",
          light: "#ffffff",
        },
      })
        .then(setQrUrl)
        .catch((err) => {
          console.error("QR Code generation error:", err);
        });
    }
  }, [open, upiId, shopName]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl p-6 text-center">
        <DialogHeader className="items-center">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-1">
            <QrCode className="w-6 h-6" />
          </div>
          <DialogTitle className="text-lg font-bold">
            {t("testUpiQr.title")}
          </DialogTitle>
          <DialogDescription className="text-xs text-neutral-500 font-medium">
            {t("testUpiQr.subtitle")}
          </DialogDescription>
        </DialogHeader>

        {/* Display Shop & UPI ID Badge */}
        <div className="bg-neutral-50 rounded-2xl p-2.5 border border-neutral-200/80 my-1 text-center">
          <p className="text-xs font-bold text-neutral-900 truncate">
            {shopName || "Shop"}
          </p>
          <p className="text-[11px] font-mono text-primary font-semibold truncate mt-0.5">
            {upiId}
          </p>
        </div>

        {/* QR Code Container */}
        <div className="flex justify-center my-2 p-2 bg-white rounded-2xl shadow-sm border border-neutral-100">
          {qrUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrUrl}
              alt="Test UPI QR Code"
              className="w-52 h-52 rounded-xl select-none"
            />
          ) : (
            <div className="w-52 h-52 flex items-center justify-center text-neutral-300 text-xs">
              Loading QR...
            </div>
          )}
        </div>

        {/* Verification Checklist */}
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3 text-left space-y-1.5 text-xs text-emerald-950">
          <div className="flex items-start gap-2">
            <Smartphone className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <span className="leading-tight">{t("testUpiQr.step1")}</span>
          </div>
          <div className="flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <span className="leading-tight">{t("testUpiQr.step2")}</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <span className="leading-tight font-medium text-emerald-800">
              {t("testUpiQr.step3")}
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-full h-11 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-sm"
          >
            {t("testUpiQr.done")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
