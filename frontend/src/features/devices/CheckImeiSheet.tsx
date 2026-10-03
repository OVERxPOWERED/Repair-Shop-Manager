import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, MessageSquare, ExternalLink, Info, Smartphone } from "lucide-react";
import { SANCHAR_SAATHI_URL, KYM_SMS_NUMBER } from "@/lib/constants/external";
import { formatIMEI } from "@/lib/validation/imei";
import { platform } from "@/native/platform";

interface CheckImeiSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultImei?: string;
}

export function CheckImeiSheet({
  open,
  onOpenChange,
  defaultImei = "",
}: CheckImeiSheetProps) {
  const t = useTranslations("devices.checkImei");
  const tCommon = useTranslations("common");
  const [imei, setImei] = useState(defaultImei);

  useEffect(() => {
    if (open) {
      setImei(defaultImei || "");
    }
  }, [open, defaultImei]);

  const cleanImei = imei.replace(/\D/g, "");
  const is15Digits = cleanImei.length === 15;

  const handleSendSms = () => {
    if (!is15Digits) return;
    const isIos = platform() === "ios";
    // iOS uses '&' delimiter for SMS body, while Android and standard URI use '?'
    const delimiter = isIos ? "&" : "?";
    const body = encodeURIComponent(`KYM ${cleanImei}`);
    const smsUrl = `sms:${KYM_SMS_NUMBER}${delimiter}body=${body}`;

    if (typeof window !== "undefined") {
      window.location.href = smsUrl;
    }
  };

  const handleOpenWeb = () => {
    if (typeof window !== "undefined") {
      window.open(SANCHAR_SAATHI_URL, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl max-h-[90vh] overflow-y-auto px-6 py-6 sm:max-w-lg mx-auto"
      >
        <SheetHeader className="text-left space-y-1 mb-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 mb-1">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <SheetTitle className="text-xl font-bold tracking-tight">
            {t("title")}
          </SheetTitle>
          <SheetDescription className="text-sm text-neutral-500">
            {t("subtitle")}
          </SheetDescription>
        </SheetHeader>

        {/* Disclaimer Banner */}
        <div className="mb-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 p-3.5 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
          <Info className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
          <p className="leading-relaxed">{t("disclaimer")}</p>
        </div>

        {/* IMEI Input or Display */}
        <div className="space-y-1.5 mb-6">
          <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            IMEI (15 digits)
          </Label>
          <div className="relative">
            <Input
              type="text"
              inputMode="numeric"
              maxLength={18}
              placeholder={t("enterImeiPlaceholder")}
              value={imei}
              onChange={(e) => setImei(e.target.value)}
              className="h-12 rounded-xl font-mono text-base tracking-wide"
            />
            {is15Digits && (
              <span className="absolute right-3 top-3.5 text-xs font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                {formatIMEI(cleanImei)}
              </span>
            )}
          </div>
        </div>

        {/* Verification Options */}
        <div className="space-y-3 mb-6">
          {/* Option 1: SMS */}
          <button
            type="button"
            disabled={!is15Digits}
            onClick={handleSendSms}
            className={`w-full p-4 rounded-2xl border text-left flex items-start gap-3.5 transition-all ${
              is15Digits
                ? "border-neutral-200 dark:border-neutral-800 hover:border-sky-500 hover:bg-sky-50/50 dark:hover:bg-sky-950/20 active:scale-[0.99]"
                : "border-neutral-200/60 dark:border-neutral-800/60 opacity-50 cursor-not-allowed"
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  {t("smsOptionTitle")}
                </span>
                <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                  SMS
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">
                {t("smsOptionDesc")}
              </p>
              {is15Digits && (
                <div className="mt-2 text-[11px] font-mono font-medium text-sky-600 dark:text-sky-400">
                  Body: KYM {cleanImei}
                </div>
              )}
            </div>
          </button>

          {/* Option 2: Sanchar Saathi Web */}
          <button
            type="button"
            onClick={handleOpenWeb}
            className="w-full p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 text-left flex items-start gap-3.5 transition-all active:scale-[0.99]"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ExternalLink className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  {t("webOptionTitle")}
                </span>
                <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                  CEIR Portal
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">
                {t("webOptionDesc")}
              </p>
            </div>
          </button>
        </div>

        {/* Dismiss Button */}
        <Button
          type="button"
          variant="outline"
          className="w-full h-12 rounded-xl text-sm font-medium"
          onClick={() => onOpenChange(false)}
        >
          {tCommon("close")}
        </Button>
      </SheetContent>
    </Sheet>
  );
}
