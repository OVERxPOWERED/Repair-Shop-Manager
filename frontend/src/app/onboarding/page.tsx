"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Smartphone,
  Laptop,
  Tv,
  Store,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  AlertCircle,
  HelpCircle,
  Building2,
  Phone,
  MapPin,
  Receipt,
  QrCode,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StepProgressBar } from "@/components/forms/StepProgressBar";
import {
  onboardingSchema,
  type OnboardingFormValues,
  type ShopType,
} from "@/features/onboarding/schema";
import { GST_STATES, GST_STATE_MAP } from "@/lib/constants/gst-states";
import { isValidUpiId } from "@/lib/validation/upi";
import { UpiTestQrModal } from "@/features/billing/UpiTestQrModal";
import { api, ApiError, newIdempotencyKey } from "@/lib/api/client";
import { useAuthStore, type MyShop } from "@/lib/auth/store";
import { errorMessage } from "@/i18n/config";
import { cn } from "@/lib/utils";

export default function OnboardingPage() {
  const router = useRouter();
  const t = useTranslations("onboarding");
  const tBilling = useTranslations("billing");
  const tErrors = useTranslations("errors");
  const { user, setSession, selectShop } = useAuthStore();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(false);
  const [testQrOpen, setTestQrOpen] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [createdShopName, setCreatedShopName] = useState("");
  const [idempotencyKey] = useState(() => newIdempotencyKey());

  const initialPhone = user?.phone ? user.phone.replace("+91", "").replace(/\D/g, "") : "";

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    trigger,
    setError,
    formState: { errors },
  } = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      name: "",
      shop_type: "mobile",
      phone: initialPhone,
      address_line1: "",
      city: "",
      pincode: "",
      state_code: "",
      gst_enabled: false,
      gstin: "",
      upi_id: "",
    },
  });

  const selectedShopType = watch("shop_type");
  const gstEnabled = watch("gst_enabled");
  const stateCode = watch("state_code");

  const handleNextFromStep1 = async () => {
    const valid = await trigger(["name", "shop_type"]);
    if (valid) {
      setGlobalError(null);
      setStep(2);
    }
  };

  const handleNextFromStep2 = async () => {
    const valid = await trigger(["phone", "pincode", "state_code"]);
    if (valid) {
      setGlobalError(null);
      setStep(3);
    }
  };

  const handleGstinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.toUpperCase();
    setValue("gstin", raw, { shouldValidate: true });
    if (raw.length >= 2) {
      const statePrefix = raw.slice(0, 2);
      if (GST_STATE_MAP[statePrefix]) {
        setValue("state_code", statePrefix, { shouldValidate: true });
      }
    }
  };

  const onSubmit = async (values: OnboardingFormValues) => {
    setLoading(true);
    setGlobalError(null);

    try {
      const payload = {
        name: values.name.trim(),
        shop_type: values.shop_type,
        phone: values.phone?.trim() ? `+91${values.phone.trim()}` : "",
        address_line1: values.address_line1?.trim() || "",
        city: values.city?.trim() || "",
        pincode: values.pincode?.trim() || "",
        state_code: values.state_code || "",
        gst_enabled: values.gst_enabled,
        gstin: values.gst_enabled ? values.gstin.trim().toUpperCase() : "",
        upi_id: values.upi_id?.trim() || "",
      };

      const res = await api<{
        shop: { id: string; name: string };
        shops: MyShop[];
      }>("/tenancy/onboard/", {
        method: "POST",
        body: payload,
        auth: true,
        shop: false,
        idempotencyKey,
      });

      if (res?.shops) {
        if (user) {
          await setSession({ user, shops: res.shops });
        }
        await selectShop(res.shop.id);
      }

      setCreatedShopName(res.shop.name || values.name);
      setStep(4);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.fields) {
          Object.entries(err.fields).forEach(([field, msgs]) => {
            setError(field as keyof OnboardingFormValues, { message: msgs[0] });
          });
        }
        setGlobalError(errorMessage(tErrors, err.code) || err.message);
      } else {
        setGlobalError(t("nameRequired"));
      }
    } finally {
      setLoading(false);
    }
  };

  const getTranslatedError = (msg?: string) => {
    if (!msg) return null;
    if (msg.startsWith("onboarding.")) {
      const key = msg.replace("onboarding.", "") as Parameters<typeof t>[0];
      return t(key);
    }
    return msg;
  };

  // Step 4: Success View
  if (step === 4) {
    return (
      <div className="min-h-screen w-full max-w-md mx-auto flex flex-col justify-between p-6 bg-background text-foreground animate-in fade-in duration-300">
        <div className="my-auto flex flex-col items-center text-center gap-6 py-12">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500 text-white shadow-xl shadow-emerald-500/25 ring-8 ring-emerald-50">
            <CheckCircle2 className="h-10 w-10" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-neutral-950">
              {t("welcomeTitle", { name: createdShopName || user?.name || "Partner" })}
            </h1>
            <p className="text-sm text-neutral-500 max-w-xs mx-auto">
              {t("welcomeSubtitle")}
            </p>
          </div>
        </div>

        <div className="w-full pb-6">
          <Button
            onClick={() => router.replace("/home/")}
            className="w-full text-base font-semibold h-[54px] rounded-2xl flex items-center justify-center gap-2"
          >
            <span>{t("goToHome")}</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full max-w-md mx-auto flex flex-col justify-between p-4 sm:p-6 bg-background text-foreground animate-in fade-in duration-300">
      <div className="w-full">
        {/* Progress Bar */}
        <StepProgressBar
          currentStep={step}
          totalSteps={3}
          labels={[t("stepShop"), t("stepContact"), t("stepBilling")]}
        />

        {/* Step Header */}
        <div className="mt-4 space-y-1">
          <h1 className="text-2xl font-extrabold tracking-tight text-neutral-950">
            {step === 1 && t("step1Title")}
            {step === 2 && t("step2Title")}
            {step === 3 && t("step3Title")}
          </h1>
          <p className="text-xs text-neutral-500">
            {step === 1 && t("step1Subtitle")}
            {step === 2 && t("step2Subtitle")}
            {step === 3 && t("step3Subtitle")}
          </p>
        </div>

        {/* Global Error Banner */}
        {globalError && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs font-medium text-rose-700 animate-in fade-in">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{globalError}</span>
          </div>
        )}

        <form id="onboarding-form" onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5">
          {/* STEP 1: Shop details */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="space-y-1.5">
                <Label htmlFor="shop-name" className="text-xs font-semibold text-neutral-800">
                  {t("shopNameLabel")} *
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
                  <Input
                    id="shop-name"
                    {...register("name")}
                    placeholder={t("shopNamePlaceholder")}
                    className="pl-10 h-12 rounded-2xl border-neutral-200 text-base"
                    autoFocus
                  />
                </div>
                {errors.name && (
                  <p className="text-xs font-semibold text-rose-600 flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>{getTranslatedError(errors.name.message)}</span>
                  </p>
                )}
              </div>

              {/* Shop Type Selection */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-neutral-800">
                  {t("shopTypeLabel")}
                </Label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { type: "mobile" as ShopType, label: t("shopTypeMobile"), icon: Smartphone },
                    { type: "computer" as ShopType, label: t("shopTypeComputer"), icon: Laptop },
                    { type: "appliance" as ShopType, label: t("shopTypeAppliance"), icon: Tv },
                    { type: "other" as ShopType, label: t("shopTypeOther"), icon: Store },
                  ].map(({ type, label, icon: Icon }) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setValue("shop_type", type, { shouldValidate: true })}
                      className={cn(
                        "flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-all",
                        selectedShopType === type
                          ? "border-primary bg-primary/5 text-primary font-semibold ring-2 ring-primary/10"
                          : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="text-xs leading-snug">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Contact & address */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Phone */}
              <div className="space-y-1.5">
                <Label htmlFor="shop-phone" className="text-xs font-semibold text-neutral-800">
                  {t("phoneLabel")}
                </Label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs font-bold text-neutral-500">
                    +91
                  </span>
                  <Input
                    id="shop-phone"
                    {...register("phone")}
                    placeholder={t("phonePlaceholder")}
                    maxLength={10}
                    className="pl-12 h-12 rounded-2xl border-neutral-200 text-base tabular-nums"
                  />
                </div>
                {errors.phone && (
                  <p className="text-xs font-semibold text-rose-600 flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>{getTranslatedError(errors.phone.message)}</span>
                  </p>
                )}
              </div>

              {/* Address Line */}
              <div className="space-y-1.5">
                <Label htmlFor="address" className="text-xs font-semibold text-neutral-800">
                  {t("addressLabel")}
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
                  <Input
                    id="address"
                    {...register("address_line1")}
                    placeholder={t("addressPlaceholder")}
                    className="pl-10 h-12 rounded-2xl border-neutral-200 text-sm"
                  />
                </div>
              </div>

              {/* City & Pincode Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="city" className="text-xs font-semibold text-neutral-800">
                    {t("cityLabel")}
                  </Label>
                  <Input
                    id="city"
                    {...register("city")}
                    placeholder={t("cityPlaceholder")}
                    className="h-12 rounded-2xl border-neutral-200 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="pincode" className="text-xs font-semibold text-neutral-800">
                    {t("pincodeLabel")}
                  </Label>
                  <Input
                    id="pincode"
                    {...register("pincode")}
                    placeholder={t("pincodePlaceholder")}
                    maxLength={6}
                    className="h-12 rounded-2xl border-neutral-200 text-sm tabular-nums"
                  />
                  {errors.pincode && (
                    <p className="text-xs font-semibold text-rose-600 flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span>{getTranslatedError(errors.pincode.message)}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* State Dropdown */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-neutral-800">
                  {t("stateLabel")}
                </Label>
                <Controller
                  control={control}
                  name="state_code"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <SelectTrigger className="h-12 rounded-2xl border-neutral-200 text-sm">
                        <SelectValue placeholder={t("selectState")} />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {GST_STATES.map((st) => (
                          <SelectItem key={st.code} value={st.code}>
                            {st.name} ({st.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.state_code && (
                  <p className="text-xs font-semibold text-rose-600 flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>{getTranslatedError(errors.state_code.message)}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Billing & Taxes */}
          {step === 3 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* GST Toggle Card */}
              <div className="p-4 rounded-2xl border border-neutral-200 bg-neutral-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label
                      htmlFor="gst-switch"
                      className="text-sm font-bold text-neutral-900 cursor-pointer"
                    >
                      {t("gstToggle")}
                    </Label>
                    <p className="text-[11px] text-neutral-500 leading-tight">
                      {t("gstToggleDesc")}
                    </p>
                  </div>
                  <Controller
                    control={control}
                    name="gst_enabled"
                    render={({ field }) => (
                      <Switch
                        id="gst-switch"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                </div>

                {/* GSTIN input when enabled */}
                {gstEnabled && (
                  <div className="pt-2 border-t border-neutral-200 space-y-1.5 animate-in fade-in">
                    <Label htmlFor="gstin" className="text-xs font-semibold text-neutral-800">
                      {t("gstinLabel")} *
                    </Label>
                    <div className="relative">
                      <Receipt className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
                      <Input
                        id="gstin"
                        value={watch("gstin")}
                        onChange={handleGstinChange}
                        placeholder={t("gstinPlaceholder")}
                        maxLength={15}
                        className="pl-10 h-12 rounded-2xl border-neutral-200 text-sm font-mono uppercase"
                        autoFocus
                      />
                    </div>
                    {errors.gstin && (
                      <p className="text-xs font-semibold text-rose-600 flex items-center gap-1 mt-1">
                        <AlertCircle className="h-3.5 w-3.5" />
                        <span>{getTranslatedError(errors.gstin.message)}</span>
                      </p>
                    )}
                    {stateCode && GST_STATE_MAP[stateCode] && (
                      <p className="text-[11px] text-emerald-700 font-medium mt-1">
                        ✓ State auto-set to: {GST_STATE_MAP[stateCode]} ({stateCode})
                      </p>
                    )}
                    {watch("gstin")?.trim().length === 15 && (
                      <div className="pt-1.5 flex items-center justify-between">
                        <a
                          href="https://services.gst.gov.in/services/searchtp"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span>{tBilling("gstVerification.verifyButton")}</span>
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* UPI ID Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="upi-id" className="text-xs font-semibold text-neutral-800">
                    {t("upiLabel")}
                  </Label>
                  <span className="text-[10px] text-neutral-400 font-medium">Optional</span>
                </div>
                <div className="relative">
                  <QrCode className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
                  <Input
                    id="upi-id"
                    {...register("upi_id")}
                    placeholder={t("upiPlaceholder")}
                    className={cn(
                      "pl-10 h-12 rounded-2xl border-neutral-200 text-sm",
                      Boolean(watch("upi_id") && isValidUpiId(watch("upi_id") || "")) && "pr-32"
                    )}
                  />
                  {Boolean(watch("upi_id") && isValidUpiId(watch("upi_id") || "")) && (
                    <button
                      type="button"
                      onClick={() => setTestQrOpen(true)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <QrCode className="h-3.5 w-3.5" />
                      <span>{tBilling("testUpiQr.button")}</span>
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-neutral-500 flex items-center gap-1">
                  <HelpCircle className="h-3.5 w-3.5 text-neutral-400" />
                  <span>{t("upiHelper")}</span>
                </p>
                {errors.upi_id && (
                  <p className="text-xs font-semibold text-rose-600 flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>{getTranslatedError(errors.upi_id.message)}</span>
                  </p>
                )}
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Wizard Bottom Controls */}
      <div className="w-full pb-6 pt-4 flex items-center gap-3">
        {step > 1 && (
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => setStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3) : 1))}
            className="flex-1 h-12 rounded-2xl border-neutral-200 text-sm font-semibold flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{t("back")}</span>
          </Button>
        )}

        {step === 1 && (
          <Button
            type="button"
            onClick={handleNextFromStep1}
            className="w-full h-[54px] rounded-2xl text-base font-semibold flex items-center justify-center gap-2"
          >
            <span>{t("next")}</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}

        {step === 2 && (
          <Button
            type="button"
            onClick={handleNextFromStep2}
            className="flex-[2] h-[54px] rounded-2xl text-base font-semibold flex items-center justify-center gap-2"
          >
            <span>{t("next")}</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}

        {step === 3 && (
          <Button
            form="onboarding-form"
            type="submit"
            disabled={loading}
            className="flex-[2] h-[54px] rounded-2xl text-base font-semibold flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>{t("creatingShop")}</span>
              </span>
            ) : (
              <span>{t("createShopBtn")}</span>
            )}
          </Button>
        )}
      </div>

      <UpiTestQrModal
        open={testQrOpen}
        onOpenChange={setTestQrOpen}
        shopName={watch("name")}
        upiId={watch("upi_id") || ""}
      />
    </div>
  );
}
