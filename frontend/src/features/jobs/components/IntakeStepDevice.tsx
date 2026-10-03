"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Smartphone, Laptop, Tv, Sparkles, Check, AlertTriangle, Plus, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useBrands, useDevices, Device as ExistingDevice } from "@/features/devices/api";
import { isValidIMEI } from "@/lib/validation/imei";
import { useIntakeStore } from "../intake-store";

interface IntakeStepDeviceProps {
  errors?: Record<string, string>;
}

const CATEGORIES = [
  { id: "mobile", icon: Smartphone },
  { id: "laptop", icon: Laptop },
  { id: "tv", icon: Tv },
  { id: "other", icon: Sparkles },
] as const;

export function IntakeStepDevice({ errors }: IntakeStepDeviceProps) {
  const t = useTranslations("intake");
  const draft = useIntakeStore((s) => s.draft);
  const updateDevice = useIntakeStore((s) => s.updateDevice);

  const { data: customerDevices, isPending: isLoadingDevices } = useDevices(
    draft.customer.id
  );

  const [isAddingNew, setIsAddingNew] = useState(() => !draft.device.id);
  const [customBrand, setCustomBrand] = useState(Boolean(draft.device.brandText && !draft.device.brandId));

  const { data: brands = [], isPending: isLoadingBrands } = useBrands(
    draft.device.category
  );

  const handleSelectExistingDevice = (dev: ExistingDevice) => {
    updateDevice({
      id: dev.id,
      category: dev.category,
      brandId: dev.brand_id ?? undefined,
      brandText: dev.brand_name || dev.brand_text,
      model: dev.model,
      color: dev.color || "",
      identifiers: dev.identifiers.map((ident) => ({
        type: ident.type as "imei1" | "imei2" | "serial",
        value: ident.value,
        capturedVia: ident.captured_via || "manual",
        confirmInvalid: ident.confirm_invalid,
      })),
    });
    setIsAddingNew(false);
  };

  const handleStartAddNew = () => {
    updateDevice({
      id: undefined,
      category: draft.device.category || "mobile",
      brandId: undefined,
      brandText: "",
      model: "",
      color: "",
      identifiers: [],
    });
    setIsAddingNew(true);
  };

  // Primary IMEI identifier helper
  const primaryImei = draft.device.identifiers.find((i) => i.type === "imei1");
  const imeiValue = primaryImei?.value || "";
  const isImeiLuhnValid = imeiValue.length === 15 ? isValidIMEI(imeiValue) : null;
  const isConfirmInvalid = primaryImei?.confirmInvalid || false;

  const handleImeiChange = (val: string) => {
    const cleaned = val.replace(/\D/g, "").slice(0, 15);
    const existing = draft.device.identifiers.filter((i) => i.type !== "imei1");
    if (!cleaned) {
      updateDevice({ identifiers: existing });
    } else {
      updateDevice({
        identifiers: [
          ...existing,
          {
            type: "imei1",
            value: cleaned,
            capturedVia: "manual",
            confirmInvalid: primaryImei?.confirmInvalid ?? false,
          },
        ],
      });
    }
  };

  const handleToggleConfirmInvalid = (checked: boolean) => {
    if (!primaryImei) return;
    const updated = draft.device.identifiers.map((ident) =>
      ident.type === "imei1" ? { ...ident, confirmInvalid: checked } : ident
    );
    updateDevice({ identifiers: updated });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
          {t("stepDeviceTitle")}
        </h2>
        <p className="text-xs text-neutral-500 mt-0.5">
          {t("stepDeviceSubtitle")}
        </p>
      </div>

      {/* Selected Existing Device Card */}
      {draft.device.id && !isAddingNew ? (
        <div className="p-4 bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-sky-100 dark:bg-sky-900/60 flex items-center justify-center text-sky-600 dark:text-sky-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                {draft.device.brandText ? `${draft.device.brandText} ` : ""}
                {draft.device.model}
              </p>
              <p className="text-xs text-neutral-500 font-mono">
                {primaryImei?.value ? `IMEI: ${primaryImei.value}` : t("noImeiRecorded")}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleStartAddNew}
            className="h-8 text-xs font-medium"
          >
            {t("changeDevice")}
          </Button>
        </div>
      ) : null}

      {/* Existing Devices Picker for returning customer */}
      {draft.customer.id && customerDevices && customerDevices.length > 0 && !draft.device.id ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
              {t("customerPreviousDevices")} ({customerDevices.length})
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleStartAddNew}
              className="h-7 text-xs text-sky-600 font-semibold px-2"
            >
              + {t("addNewDevice")}
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto">
            {customerDevices.map((dev) => {
              const imei = dev.identifiers.find((i) => i.type === "imei1")?.value;
              return (
                <button
                  key={dev.id}
                  type="button"
                  onClick={() => handleSelectExistingDevice(dev)}
                  className="w-full p-3 text-left rounded-2xl border border-neutral-200 dark:border-neutral-800 hover:border-sky-500 bg-white dark:bg-neutral-900 flex items-center justify-between transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                        {dev.brand_name ? `${dev.brand_name} ` : ""}
                        {dev.model}
                      </p>
                      <p className="text-xs text-neutral-500 font-mono">
                        {imei ? `IMEI: ${imei}` : dev.category}
                      </p>
                    </div>
                  </div>
                  <Plus className="w-4 h-4 text-neutral-400" />
                </button>
              );
            })}
          </div>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-neutral-200 dark:border-neutral-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-neutral-950 px-2 text-neutral-400">
                {t("orAddDeviceBelow")}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {/* New Device Form */}
      {(isAddingNew || !draft.device.id) && (
        <div className="space-y-4">
          {/* Category Chips */}
          <div>
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1.5">
              {t("deviceCategory")} *
            </label>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.map((cat) => {
                const isSelected = draft.device.category === cat.id;
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => updateDevice({ category: cat.id, brandId: undefined })}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border text-xs font-semibold transition-all ${
                      isSelected
                        ? "border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 shadow-sm"
                        : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50"
                    }`}
                  >
                    <Icon className="w-5 h-5 mb-1" />
                    <span className="capitalize">{t(`categories.${cat.id}`)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Brand Selection */}
          <div>
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
              {t("deviceBrand")} *
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {brands.slice(0, 10).map((b) => {
                const isSelected = draft.device.brandId === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      setCustomBrand(false);
                      updateDevice({ brandId: b.id, brandText: b.name });
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      isSelected
                        ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-transparent shadow-sm"
                        : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-neutral-400"
                    }`}
                  >
                    {b.name}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  setCustomBrand(true);
                  updateDevice({ brandId: undefined, brandText: "" });
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  customBrand
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-transparent shadow-sm"
                    : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-neutral-400"
                }`}
              >
                + {t("otherBrand")}
              </button>
            </div>

            {customBrand && (
              <Input
                type="text"
                placeholder={t("specifyBrandPlaceholder")}
                value={draft.device.brandText || ""}
                onChange={(e) => updateDevice({ brandText: e.target.value })}
                className={`h-11 text-sm rounded-xl ${errors?.brandId ? "border-red-500" : ""}`}
              />
            )}
            {errors?.brandId && (
              <p className="text-xs text-red-500 font-medium mt-1">{errors.brandId}</p>
            )}
          </div>

          {/* Model & Color */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                {t("deviceModel")} *
              </label>
              <Input
                type="text"
                placeholder="iPhone 13"
                value={draft.device.model}
                onChange={(e) => updateDevice({ model: e.target.value })}
                className={`h-11 text-sm rounded-xl ${errors?.model ? "border-red-500" : ""}`}
              />
              {errors?.model && (
                <p className="text-xs text-red-500 font-medium mt-1">{errors.model}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                {t("deviceColor")}
              </label>
              <Input
                type="text"
                placeholder="Black"
                value={draft.device.color}
                onChange={(e) => updateDevice({ color: e.target.value })}
                className="h-11 text-sm rounded-xl"
              />
            </div>
          </div>

          {/* IMEI 1 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                {t("deviceImei1")}
              </label>
              {imeiValue.length > 0 && (
                <span className="text-[11px] font-mono text-neutral-400">
                  {imeiValue.length}/15 digits
                </span>
              )}
            </div>

            <div className="relative">
              <Input
                type="text"
                inputMode="numeric"
                placeholder="356938035643809"
                value={imeiValue}
                onChange={(e) => handleImeiChange(e.target.value)}
                className={`h-11 text-sm font-mono tracking-wider rounded-xl pr-9 ${
                  isImeiLuhnValid === false && !isConfirmInvalid
                    ? "border-amber-500"
                    : isImeiLuhnValid === true
                    ? "border-emerald-500"
                    : ""
                }`}
              />
              <div className="absolute right-3 top-3.5 pointer-events-none">
                {isImeiLuhnValid === true && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                )}
                {isImeiLuhnValid === false && (
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                )}
              </div>
            </div>

            {/* Non-standard IMEI Override */}
            {isImeiLuhnValid === false && (
              <div className="mt-2 p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-2.5">
                <Checkbox
                  id="confirm-invalid-imei"
                  checked={isConfirmInvalid}
                  onCheckedChange={handleToggleConfirmInvalid}
                  className="mt-0.5"
                />
                <label
                  htmlFor="confirm-invalid-imei"
                  className="text-xs text-amber-900 dark:text-amber-200 leading-tight cursor-pointer"
                >
                  {t("nonStandardImeiConfirmation")}
                </label>
              </div>
            )}
            {errors?.["identifiers.0.value"] && (
              <p className="text-xs text-red-500 font-medium mt-1">
                {errors["identifiers.0.value"]}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
