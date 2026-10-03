"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MoneyInput } from "@/components/forms/MoneyInput";
import { newIdempotencyKey } from "@/lib/api/client";
import {
  useRecordPayment,
  type PaymentMode,
} from "@/features/billing/api";

export interface PaymentSheetProps {
  jobId: string;
  balancePaise: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultMode?: PaymentMode;
  focusReference?: boolean;
}

export function PaymentSheet({
  jobId,
  balancePaise,
  open,
  onOpenChange,
  defaultMode = "cash",
  focusReference = false,
}: PaymentSheetProps) {
  const t = useTranslations("billing");
  const [mode, setMode] = useState<PaymentMode>(defaultMode);
  const [amountPaise, setAmountPaise] = useState(0);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [error, setError] = useState<string | null>(null);

  const refInputRef = useRef<HTMLInputElement>(null);
  const recordMutation = useRecordPayment(jobId);

  useEffect(() => {
    if (open) {
      setMode(defaultMode);
      setAmountPaise(Math.max(0, balancePaise));
      setReference("");
      setNotes("");
      setIdempotencyKey(newIdempotencyKey());
      setError(null);

      if (focusReference) {
        setTimeout(() => {
          refInputRef.current?.focus();
        }, 150);
      }
    }
  }, [open, balancePaise, defaultMode, focusReference]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amountPaise <= 0) {
      setError(t("validation.amountPositive"));
      return;
    }

    try {
      await recordMutation.mutateAsync({
        mode,
        amount_paise: amountPaise,
        reference: reference.trim(),
        notes: notes.trim(),
        idempotencyKey,
      });
      toast.success(t("payment.recordedSuccess"));
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("payment.recordFailed");
      toast.error(msg);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] overflow-y-auto p-6">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-base font-bold">{t("payment.recordTitle")}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Mode Selector */}
          <div>
            <Label className="text-xs text-neutral-500 font-medium mb-1.5 block">
              {t("payment.modeLabel")}
            </Label>
            <div className="grid grid-cols-4 gap-2">
              {(["cash", "upi", "card", "bank"] as const).map((m) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => setMode(m)}
                  className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                    mode === m
                      ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-neutral-900 dark:border-white shadow-sm"
                      : "bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700"
                  }`}
                >
                  {t(`payment.modes.${m}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <Label className="text-xs text-neutral-500 font-medium mb-1.5 block">
              {t("payment.amountLabel")}
            </Label>
            <MoneyInput
              value={amountPaise}
              onChange={setAmountPaise}
              placeholder="0.00"
              className="h-12 text-lg"
            />
          </div>

          {/* Reference (for UPI, Card, Bank) */}
          {mode !== "cash" && (
            <div>
              <Label htmlFor="payment-ref" className="text-xs text-neutral-500 font-medium mb-1.5 block">
                {mode === "upi"
                  ? t("payment.upiRefLabel")
                  : mode === "card"
                  ? t("payment.cardRefLabel")
                  : t("payment.bankRefLabel")}
              </Label>
              <Input
                id="payment-ref"
                ref={refInputRef}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder={
                  mode === "upi"
                    ? "e.g. 12-digit UTR / UPI Ref"
                    : mode === "card"
                    ? "e.g. Auth Code / Last 4 digits"
                    : "e.g. Transaction Ref / NEFT"
                }
                className="h-11"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <Label htmlFor="payment-notes" className="text-xs text-neutral-500 font-medium mb-1.5 block">
              {t("payment.notesLabel")}
            </Label>
            <Textarea
              id="payment-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("payment.notesPlaceholder")}
              rows={2}
              className="resize-none"
            />
          </div>

          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

          <div className="pt-2 flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-12 rounded-xl"
              disabled={recordMutation.isPending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={recordMutation.isPending}
              className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {recordMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                t("payment.recordSubmit")
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
