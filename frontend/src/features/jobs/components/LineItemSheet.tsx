"use client";

import React, { useState, useEffect } from "react";
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
import { MoneyInput } from "@/components/forms/MoneyInput";
import { usePermission } from "@/lib/auth/store";
import { formatPaise } from "@/lib/format/money";
import {
  useCreateLineItem,
  useUpdateLineItem,
  type JobLineItem,
  type JobLineItemKind,
} from "@/features/billing/api";

export interface LineItemSheetProps {
  jobId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemToEdit?: JobLineItem | null;
}

export function LineItemSheet({
  jobId,
  open,
  onOpenChange,
  itemToEdit,
}: LineItemSheetProps) {
  const t = useTranslations("billing");
  const canSeeCost = usePermission("money.see_cost_profit");

  const [kind, setKind] = useState<JobLineItemKind>("part");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPricePaise, setUnitPricePaise] = useState(0);
  const [unitCostPaise, setUnitCostPaise] = useState(0);
  const [discountPaise, setDiscountPaise] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const createMutation = useCreateLineItem(jobId);
  const updateMutation = useUpdateLineItem(jobId);
  const isSaving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (open) {
      if (itemToEdit) {
        setKind(itemToEdit.kind);
        setDescription(itemToEdit.description);
        setQuantity(itemToEdit.quantity.toString());
        setUnitPricePaise(itemToEdit.unit_price_paise);
        setUnitCostPaise(itemToEdit.unit_cost_paise ?? 0);
        setDiscountPaise(itemToEdit.discount_paise);
      } else {
        setKind("part");
        setDescription("");
        setQuantity("1");
        setUnitPricePaise(0);
        setUnitCostPaise(0);
        setDiscountPaise(0);
      }
      setError(null);
    }
  }, [open, itemToEdit]);

  const numQty = parseFloat(quantity) || 0;
  const lineGross = Math.round(numQty * unitPricePaise);
  const lineTotal = Math.max(0, lineGross - discountPaise);

  const handleSubmit = async (e: React.FormEvent) => {
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

    try {
      if (itemToEdit) {
        await updateMutation.mutateAsync({
          itemId: itemToEdit.id,
          version: itemToEdit.version,
          data: {
            kind,
            description: description.trim(),
            quantity: numQty,
            unit_price_paise: unitPricePaise,
            ...(canSeeCost ? { unit_cost_paise: unitCostPaise } : {}),
            discount_paise: discountPaise,
          },
        });
        toast.success(t("lineItems.updatedSuccess"));
      } else {
        await createMutation.mutateAsync({
          kind,
          description: description.trim(),
          quantity: numQty,
          unit_price_paise: unitPricePaise,
          ...(canSeeCost ? { unit_cost_paise: unitCostPaise } : {}),
          discount_paise: discountPaise,
        });
        toast.success(t("lineItems.addedSuccess"));
      }
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("lineItems.saveFailed");
      toast.error(msg);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] overflow-y-auto p-6">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-base font-bold">
            {itemToEdit ? t("lineItems.editTitle") : t("lineItems.addTitle")}
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Kind selector pills */}
          <div>
            <Label className="text-xs text-neutral-500 font-medium mb-1.5 block">
              {t("lineItems.typeLabel")}
            </Label>
            <div className="flex gap-2">
              {(["part", "labour", "other"] as const).map((k) => (
                <button
                  type="button"
                  key={k}
                  onClick={() => setKind(k)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    kind === k
                      ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-neutral-900 dark:border-white shadow-sm"
                      : "bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700"
                  }`}
                >
                  {t(`lineItems.kinds.${k}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="item-desc" className="text-xs text-neutral-500 font-medium mb-1.5 block">
              {t("lineItems.descLabel")}
            </Label>
            <Input
              id="item-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("lineItems.descPlaceholder")}
              className="h-11"
              required
            />
          </div>

          {/* Quantity & Unit Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="item-qty" className="text-xs text-neutral-500 font-medium mb-1.5 block">
                {t("lineItems.qtyLabel")}
              </Label>
              <Input
                id="item-qty"
                type="number"
                step="any"
                min="0.001"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="h-11"
                required
              />
            </div>

            <div>
              <Label className="text-xs text-neutral-500 font-medium mb-1.5 block">
                {t("lineItems.priceLabel")}
              </Label>
              <MoneyInput
                value={unitPricePaise}
                onChange={setUnitPricePaise}
                placeholder="0.00"
                className="h-11"
              />
            </div>
          </div>

          {/* Unit Cost (permission-gated) & Discount */}
          <div className="grid grid-cols-2 gap-3">
            {canSeeCost ? (
              <div>
                <Label className="text-xs text-neutral-500 font-medium mb-1.5 block">
                  {t("lineItems.costLabel")}
                </Label>
                <MoneyInput
                  value={unitCostPaise}
                  onChange={setUnitCostPaise}
                  placeholder="0.00"
                  className="h-11"
                />
              </div>
            ) : (
              <div />
            )}

            <div>
              <Label className="text-xs text-neutral-500 font-medium mb-1.5 block">
                {t("lineItems.discountLabel")}
              </Label>
              <MoneyInput
                value={discountPaise}
                onChange={setDiscountPaise}
                placeholder="0.00"
                className="h-11"
              />
            </div>
          </div>

          {/* Calculated Line Total Preview */}
          <div className="bg-neutral-50 dark:bg-neutral-800/60 p-3 rounded-xl flex items-center justify-between text-sm">
            <span className="text-neutral-500 font-medium">{t("lineItems.lineTotalLabel")}</span>
            <span className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              {formatPaise(lineTotal)}
            </span>
          </div>

          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

          <div className="pt-2 flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-12 rounded-xl"
              disabled={isSaving}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="flex-1 h-12 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 font-semibold"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : t("common.save")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
