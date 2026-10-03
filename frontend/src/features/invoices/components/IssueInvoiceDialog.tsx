"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Loader2, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface IssueInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  isIssuing?: boolean;
}

export function IssueInvoiceDialog({
  open,
  onOpenChange,
  onConfirm,
  isIssuing = false,
}: IssueInvoiceDialogProps) {
  const t = useTranslations("invoices");

  const handleIssue = async () => {
    await onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl p-6">
        <DialogHeader>
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <DialogTitle className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
            {t("issueConfirmTitle")}
          </DialogTitle>
          <DialogDescription className="text-xs text-neutral-600 dark:text-neutral-400 font-medium leading-relaxed">
            {t("issueConfirmDesc")}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-0 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isIssuing}
            className="rounded-xl text-xs font-semibold"
          >
            {t("cancelDialogDismiss")}
          </Button>
          <Button
            type="button"
            onClick={handleIssue}
            disabled={isIssuing}
            className="rounded-xl text-xs font-bold bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900"
          >
            {isIssuing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                {t("issuing")}
              </>
            ) : (
              t("issueConfirmBtn")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
