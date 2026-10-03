"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Smartphone, Laptop, Tv, Wrench, Box, AlertCircle, CheckCircle2, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useCreateDevice, useUpdateDevice, useBrands, type Device, type DeviceIdentifier } from "./api";
import { isValidIMEI, formatIMEI } from "@/lib/validation/imei";
import { ApiError } from "@/lib/api/client";

interface DeviceFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  device?: Device | null;
  onSaved?: (device: Device) => void;
}

const CATEGORIES = [
  { value: "mobile", label: "Mobile", icon: Smartphone },
  { value: "laptop", label: "Laptop", icon: Laptop },
  { value: "tv", label: "TV", icon: Tv },
  { value: "appliance", label: "Appliance", icon: Wrench },
  { value: "other", label: "Other", icon: Box },
] as const;

export function DeviceFormSheet({ open, onOpenChange, customerId, device, onSaved }: DeviceFormSheetProps) {
  const t = useTranslations("devices");
  const tCommon = useTranslations("common");

  const isEdit = Boolean(device);

  const [category, setCategory] = useState<"mobile" | "laptop" | "tv" | "appliance" | "other">("mobile");
  const [brandId, setBrandId] = useState<string>("other");
  const [brandText, setBrandText] = useState("");
  const [model, setModel] = useState("");
  const [color, setColor] = useState("");
  const [notes, setNotes] = useState("");

  const [identifiers, setIdentifiers] = useState<Array<DeviceIdentifier>>([
    { type: "imei1", value: "", confirm_invalid: false },
  ]);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const { data: brands = [], isLoading: isLoadingBrands } = useBrands(category);

  // Prepopulate form on open / device change
  useEffect(() => {
    if (device) {
      setCategory(device.category);
      setBrandId(device.brand_id ?? "other");
      setBrandText(device.brand_text ?? "");
      setModel(device.model);
      setColor(device.color ?? "");
      setNotes(device.notes ?? "");
      if (device.identifiers && device.identifiers.length > 0) {
        setIdentifiers(
          device.identifiers.map((ident) => ({
            id: ident.id,
            type: ident.type,
            value: ident.value,
            luhn_valid: ident.luhn_valid,
            captured_via: ident.captured_via ?? "manual",
            confirm_invalid: ident.luhn_valid === false,
          }))
        );
      } else {
        setIdentifiers([
          {
            type: device.category === "mobile" ? "imei1" : "serial",
            value: "",
            confirm_invalid: false,
          },
        ]);
      }
    } else {
      setCategory("mobile");
      setBrandId("");
      setBrandText("");
      setModel("");
      setColor("");
      setNotes("");
      setIdentifiers([{ type: "imei1", value: "", confirm_invalid: false }]);
    }
    setFormErrors({});
    setGeneralError(null);
  }, [device, open]);

  // When category changes in create mode, adapt default identifier type
  const handleCategoryChange = (newCat: "mobile" | "laptop" | "tv" | "appliance" | "other") => {
    setCategory(newCat);
    setBrandId("");
    setBrandText("");
    if (!isEdit) {
      if (newCat === "mobile") {
        setIdentifiers([{ type: "imei1", value: "", confirm_invalid: false }]);
      } else {
        setIdentifiers([{ type: "serial", value: "", confirm_invalid: false }]);
      }
    }
  };

  const createDeviceMutation = useCreateDevice();
  const updateDeviceMutation = useUpdateDevice();
  const isSubmitting = createDeviceMutation.isPending || updateDeviceMutation.isPending;

  const handleIdentifierChange = (index: number, field: keyof DeviceIdentifier, val: any) => {
    setIdentifiers((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const addIdentifier = (type: "imei2" | "serial" | "meid") => {
    setIdentifiers((prev) => [...prev, { type, value: "", confirm_invalid: false }]);
  };

  const removeIdentifier = (index: number) => {
    setIdentifiers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    setGeneralError(null);

    if (!model.trim()) {
      setFormErrors({ model: t("modelRequired") });
      return;
    }

    const selectedBrand = brands.find((b) => b.id === brandId);
    const finalBrandId = selectedBrand ? selectedBrand.id : null;
    const finalBrandText = finalBrandId ? "" : brandText.trim();

    // Filter valid identifiers
    const cleanedIdentifiers = identifiers
      .filter((i) => i.value && i.value.trim().length > 0)
      .map((i) => ({
        type: i.type,
        value: i.value.trim(),
        captured_via: i.captured_via ?? "manual",
        confirm_invalid: Boolean(i.confirm_invalid),
      }));

    try {
      if (isEdit && device) {
        const updated = await updateDeviceMutation.mutateAsync({
          id: device.id,
          version: device.version,
          customer_id: customerId,
          category,
          brand_id: finalBrandId,
          brand_text: finalBrandText,
          model: model.trim(),
          color: color.trim(),
          notes: notes.trim(),
          identifiers: cleanedIdentifiers,
        });
        toast.success(t("deviceUpdatedSuccess"));
        onOpenChange(false);
        onSaved?.(updated);
      } else {
        const created = await createDeviceMutation.mutateAsync({
          customer_id: customerId,
          category,
          brand_id: finalBrandId,
          brand_text: finalBrandText,
          model: model.trim(),
          color: color.trim(),
          notes: notes.trim(),
          identifiers: cleanedIdentifiers,
        });
        toast.success(t("deviceCreatedSuccess"));
        onOpenChange(false);
        onSaved?.(created);
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.code === "imei.invalid_check_digit") {
          setGeneralError(t("imeiCheckDigitError"));
        } else if (err.code === "imei.invalid_format") {
          setGeneralError(t("imeiFormatError"));
        } else if (err.fields) {
          const srvErrors: Record<string, string> = {};
          for (const [k, v] of Object.entries(err.fields)) {
            srvErrors[k] = v[0] || err.message;
          }
          setFormErrors(srvErrors);
        } else {
          setGeneralError(err.message);
        }
      } else {
        setGeneralError(tCommon("errors.generic"));
      }
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[92vh] overflow-y-auto px-6 py-6 sm:max-w-lg mx-auto">
        <SheetHeader className="text-left space-y-1 mb-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-1">
            <Smartphone className="h-5 w-5" />
          </div>
          <SheetTitle className="text-xl font-bold tracking-tight">
            {isEdit ? t("editDeviceTitle") : t("newDeviceTitle")}
          </SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            {isEdit ? t("editDeviceSubtitle") : t("newDeviceSubtitle")}
          </SheetDescription>
        </SheetHeader>

        {generalError && (
          <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{generalError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{t("categoryLabel")}</Label>
            <div className="grid grid-cols-5 gap-1.5">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.value;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => handleCategoryChange(cat.value)}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all text-xs font-medium gap-1 ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                        : "border-border hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="truncate w-full text-center">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Brand Picker */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{t("brandLabel")}</Label>
            <Select value={brandId} onValueChange={setBrandId}>
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder={t("selectBrandPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {brands.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
                <SelectItem value="other">{t("brandOtherOption")}</SelectItem>
              </SelectContent>
            </Select>

            {/* If Other selected, show custom brand text */}
            {brandId === "other" && (
              <Input
                value={brandText}
                onChange={(e) => setBrandText(e.target.value)}
                placeholder={t("customBrandPlaceholder")}
                className="h-10 mt-1.5 rounded-xl text-sm"
              />
            )}
          </div>

          {/* Model Name */}
          <div className="space-y-1.5">
            <Label htmlFor="dev-model" className="text-xs font-semibold">
              {t("modelLabel")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="dev-model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={t("modelPlaceholder")}
              className="h-11 rounded-xl"
            />
            {formErrors.model && <p className="text-xs text-destructive">{formErrors.model}</p>}
          </div>

          {/* Color */}
          <div className="space-y-1.5">
            <Label htmlFor="dev-color" className="text-xs font-semibold">
              {t("colorLabel")}
            </Label>
            <Input
              id="dev-color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder={t("colorPlaceholder")}
              className="h-11 rounded-xl"
            />
          </div>

          {/* Identifiers Section */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">{t("identifiersTitle")}</Label>
              {identifiers.length < 3 && (
                <button
                  type="button"
                  onClick={() => addIdentifier(identifiers.some((i) => i.type === "imei1") ? "imei2" : "serial")}
                  className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t("addIdentifierBtn")}
                </button>
              )}
            </div>

            {identifiers.map((ident, idx) => {
              const isImei = ident.type === "imei1" || ident.type === "imei2";
              const cleanDigits = ident.value.replace(/[\s-]/g, "");
              const is15Digits = cleanDigits.length === 15 && /^\d+$/.test(cleanDigits);
              const luhnPassed = isImei && is15Digits ? isValidIMEI(cleanDigits) : null;

              return (
                <div key={idx} className="rounded-xl border p-3 space-y-2 bg-card">
                  <div className="flex items-center justify-between gap-2">
                    <Select
                      value={ident.type}
                      onValueChange={(val: any) => handleIdentifierChange(idx, "type", val)}
                    >
                      <SelectTrigger className="h-9 w-32 rounded-lg text-xs font-medium">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="imei1">IMEI 1</SelectItem>
                        <SelectItem value="imei2">IMEI 2</SelectItem>
                        <SelectItem value="serial">Serial No.</SelectItem>
                        <SelectItem value="meid">MEID</SelectItem>
                      </SelectContent>
                    </Select>

                    {identifiers.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeIdentifier(idx)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="relative">
                    <Input
                      value={ident.value}
                      onChange={(e) => {
                        const val = e.target.value;
                        handleIdentifierChange(idx, "value", val);
                      }}
                      placeholder={isImei ? t("imeiPlaceholder") : t("serialPlaceholder")}
                      className="h-10 rounded-xl font-mono text-sm"
                    />
                    {isImei && is15Digits && (
                      <div className="absolute right-3 top-2.5">
                        {luhnPassed ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-amber-500" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Warning and confirm checkbox for invalid Luhn */}
                  {isImei && is15Digits && luhnPassed === false && (
                    <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5 text-xs text-amber-800 dark:text-amber-200 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-medium">
                        <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                        <span>{t("invalidLuhnWarning")}</span>
                      </div>
                      <div className="flex items-center gap-2 pt-0.5">
                        <Checkbox
                          id={`confirm-luhn-${idx}`}
                          checked={Boolean(ident.confirm_invalid)}
                          onCheckedChange={(checked) => handleIdentifierChange(idx, "confirm_invalid", Boolean(checked))}
                        />
                        <label
                          htmlFor={`confirm-luhn-${idx}`}
                          className="text-xs cursor-pointer select-none font-medium"
                        >
                          {t("confirmSaveInvalidImei")}
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="dev-notes" className="text-xs font-semibold">
              {t("notesLabel")}
            </Label>
            <Textarea
              id="dev-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("notesPlaceholder")}
              className="min-h-[60px] rounded-xl text-sm"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-12 rounded-xl text-sm font-medium"
              onClick={() => onOpenChange(false)}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 h-12 rounded-xl text-sm font-medium"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {tCommon("submitting")}
                </>
              ) : isEdit ? (
                t("saveDeviceBtn")
              ) : (
                t("createDeviceBtn")
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
