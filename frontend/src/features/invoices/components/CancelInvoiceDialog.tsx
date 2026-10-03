"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export interface CancelInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceNumber: string;
  onConfirm: (reason: string) => Promise<void>;
  isCancelling?: boolean;
}

export function CancelInvoiceDialog({
  open,
  onOpenChange,
  invoiceNumber,
  onConfirm,
  isCancelling = false,
}: CancelInvoiceDialogProps) {
  const t = useTranslations("invoices");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleCancel = async () => {
    if (!reason.trim()) {
      setError(t("cancelReasonRequired"));
      return;
    }
    setError(null);
    try {
      await onConfirm(reason.trim());
      setReason("");
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("cancelFailed");
      setError(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl p-6">
        <DialogHeader>
          <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-2">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <DialogTitle className="text-lg font-bold text-rose-600">
            {t("cancelInvoiceTitle")}
          </DialogTitle>
          <DialogDescription className="text-xs text-neutral-500">
            {t("cancelInvoiceDesc", { number: invoiceNumber })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="cancel-reason" className="text-xs font-semibold">
              {t("cancelReasonLabel")} *
            </Label>
            <Textarea
              id="cancel-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("cancelReasonPlaceholder")}
              className="rounded-xl min-h-[90px] text-xs resize-none"
              disabled={isCancelling}
            />
            <p className="text-[11px] text-neutral-400">
              {t("cancelCreditNoteNote")}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCancelling}
            className="rounded-xl text-xs font-semibold"
          >
            {t("cancelDialogDismiss")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleCancel}
            disabled={isCancelling || !reason.trim()}
            className="rounded-xl text-xs font-bold"
          >
            {isCancelling ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                {t("cancelling")}
              </>
            ) : (
              t("cancelConfirmBtn")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
