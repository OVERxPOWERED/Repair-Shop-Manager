"use client";

import React from "react";
import { useTranslations } from "next-intl";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useShopJoinCode } from "./api";
import { Copy, Check, Share2, Loader2, Sparkles, KeyRound } from "lucide-react";
import { toast } from "sonner";

interface QuickShareCodeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickShareCodeSheet({ open, onOpenChange }: QuickShareCodeSheetProps) {
  const t = useTranslations("staff");
  const tCommon = useTranslations("common");
  const { data: joinCodeData, isLoading } = useShopJoinCode();
  const [copied, setCopied] = React.useState(false);

  const code = joinCodeData?.join_code || "";

  const handleCopy = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success(t("codeCopied"));
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    if (!code) return;
    const msg = t("whatsAppShareMessage", { code });
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl max-h-[85vh] px-6 py-6 sm:max-w-md mx-auto"
      >
        <SheetHeader className="text-left space-y-1 mb-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-2">
            <KeyRound className="h-6 w-6" />
          </div>
          <SheetTitle className="text-xl font-bold tracking-tight">
            {t("quickShareSheetTitle")}
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            {t("quickShareSheetDesc")}
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">{tCommon("loading")}</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Big Code Card */}
            <div className="p-6 rounded-3xl bg-neutral-900 text-white dark:bg-neutral-950 border border-neutral-800 text-center space-y-2 shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                {t("masterCodeTitle")}
              </span>
              <div className="text-3xl font-mono font-black tracking-widest text-white">
                {code || "FX-XXXX"}
              </div>
              <div className="pt-1">
                <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                  {joinCodeData?.is_expired ? t("codeExpired") : t("codeActive")}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={handleCopy}
                className="h-12 rounded-2xl text-xs font-bold gap-2"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{t("copyCode")}</span>
              </Button>

              <Button
                onClick={handleWhatsAppShare}
                className="h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-2 shadow-sm"
              >
                <Share2 className="w-4 h-4" />
                <span>{t("shareWhatsApp")}</span>
              </Button>
            </div>

            <div className="pt-2">
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="w-full h-11 rounded-xl text-xs font-semibold"
              >
                {tCommon("close")}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
