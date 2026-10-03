"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/forms/MoneyInput";
import { formatPaise } from "@/lib/format/money";
import type { InvoiceLine, InvoiceLineInput } from "../api";

export interface InvoiceLineSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemToEdit: (InvoiceLine | InvoiceLineInput) | null;
  isGstEnabled: boolean;
  onSave: (line: InvoiceLineInput) => void;
  isSaving?: boolean;
}

const GST_RATES = [
  { label: "0%", value: 0 },
  { label: "5%", value: 500 },
  { label: "12%", value: 1200 },
  { label: "18%", value: 1800 },
  { label: "28%", value: 2800 },
];

export function InvoiceLineSheet({
  open,
  onOpenChange,
  itemToEdit,
  isGstEnabled,
  onSave,
  isSaving = false,
}: InvoiceLineSheetProps) {
  const t = useTranslations("invoices");

  const [description, setDescription] = useState("");
  const [hsnSac, setHsnSac] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPricePaise, setUnitPricePaise] = useState(0);
  const [discountPaise, setDiscountPaise] = useState(0);
  const [taxInclusive, setTaxInclusive] = useState(false);
  const [taxRateBp, setTaxRateBp] = useState(1800);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (itemToEdit) {
        setDescription(itemToEdit.description || "");
        setHsnSac(itemToEdit.hsn_sac || "");
        setQuantity(itemToEdit.quantity?.toString() || "1");
        setUnitPricePaise(itemToEdit.unit_price_paise || 0);
        setDiscountPaise(itemToEdit.discount_paise || 0);
        setTaxInclusive(Boolean(itemToEdit.tax_inclusive));
        setTaxRateBp(itemToEdit.tax_rate_bp ?? (isGstEnabled ? 1800 : 0));
      } else {
        setDescription("");
        setHsnSac("");
        setQuantity("1");
        setUnitPricePaise(0);
        setDiscountPaise(0);
        setTaxInclusive(false);
        setTaxRateBp(isGstEnabled ? 1800 : 0);
      }
      setError(null);
    }
  }, [open, itemToEdit, isGstEnabled]);

  const numQty = parseFloat(quantity) || 0;
  const lineGross = Math.round(numQty * unitPricePaise);
  const lineSubtotal = Math.max(0, lineGross - discountPaise);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError(t("validation.descRequired"));
      return;
    }
    if (numQty <= 0) {
      setError(t("validation.qtyPositive"));
      return;
    }
    if (discountPaise > lineGross) {
      setError(t("validation.discountExceedsGross"));
      return;
    }

    onSave({
      description: description.trim(),
      hsn_sac: hsnSac.trim(),
      quantity: numQty,
      unit_price_paise: unitPricePaise,
      discount_paise: discountPaise,
      tax_inclusive: taxInclusive,
      tax_rate_bp: isGstEnabled ? taxRateBp : 0,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-w-lg mx-auto p-6 max-h-[90vh] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-lg font-bold">
            {itemToEdit ? t("editLineTitle") : t("addLineTitle")}
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="line-desc" className="text-xs font-semibold">
              {t("lineDesc")} *
            </Label>
            <Input
              id="line-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("lineDescPlaceholder")}
              className="rounded-xl h-11"
              required
            />
          </div>

          {/* HSN/SAC if GST */}
          {isGstEnabled && (
            <div className="space-y-1.5">
              <Label htmlFor="line-hsn" className="text-xs font-semibold">
                {t("lineHsnSac")}
              </Label>
              <Input
                id="line-hsn"
                value={hsnSac}
                onChange={(e) => setHsnSac(e.target.value)}
                placeholder="e.g. 9987 / 8517"
                maxLength={8}
                className="rounded-xl h-11 uppercase"
              />
            </div>
          )}

          {/* Quantity & Unit Price */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="line-qty" className="text-xs font-semibold">
                {t("lineQty")}
              </Label>
              <Input
                id="line-qty"
                type="number"
                step="any"
                min="0.001"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="rounded-xl h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">{t("lineUnitPrice")} *</Label>
              <MoneyInput
                value={unitPricePaise}
                onChange={setUnitPricePaise}
                placeholder="0"
              />
            </div>
          </div>

          {/* Discount */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{t("lineDiscount")}</Label>
            <MoneyInput
              value={discountPaise}
              onChange={setDiscountPaise}
              placeholder="0"
            />
          </div>

          {/* GST Options */}
          {isGstEnabled && (
            <div className="space-y-3 pt-2 border-t border-neutral-100">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-semibold">{t("taxInclusive")}</Label>
                  <p className="text-[11px] text-neutral-500">{t("taxInclusiveHint")}</p>
                </div>
                <input
                  type="checkbox"
                  checked={taxInclusive}
                  onChange={(e) => setTaxInclusive(e.target.checked)}
                  className="w-4 h-4 rounded text-neutral-900 focus:ring-neutral-900"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">{t("taxRate")}</Label>
                <div className="grid grid-cols-5 gap-1.5">
                  {GST_RATES.map((rate) => (
                    <button
                      key={rate.value}
                      type="button"
                      onClick={() => setTaxRateBp(rate.value)}
                      className={`h-9 rounded-xl text-xs font-bold border transition-colors ${
                        taxRateBp === rate.value
                          ? "bg-neutral-900 text-white border-neutral-900"
                          : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50"
                      }`}
                    >
                      {rate.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Preview Calculation */}
          <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200/80 flex items-center justify-between text-xs font-medium">
            <span className="text-neutral-500">{t("lineTotalEst")}:</span>
            <span className="text-sm font-bold text-neutral-900">
              {formatPaise(lineSubtotal)}
            </span>
          </div>

          <Button
            type="submit"
            disabled={isSaving}
            className="w-full h-11 rounded-xl font-bold text-sm bg-neutral-900 text-white hover:bg-neutral-800"
          >
            {itemToEdit ? t("saveLine") : t("addLine")}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
