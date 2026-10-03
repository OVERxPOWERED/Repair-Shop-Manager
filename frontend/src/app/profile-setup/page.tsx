"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { User as UserIcon, Mail, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";
import { useLocaleStore } from "@/i18n/store";
import { profileSchema, type ProfileFormValues } from "@/features/auth/schemas";
import { api, ApiError } from "@/lib/api/client";
import { useAuthStore, type User, type MyShop } from "@/lib/auth/store";
import { nextRoute } from "@/lib/auth/route";
import { errorMessage } from "@/i18n/config";

export default function ProfileSetupPage() {
  const router = useRouter();
  const t = useTranslations("auth");
  const tErrors = useTranslations("errors");
  const locale = useLocaleStore((s) => s.locale);
  const user = useAuthStore((s) => s.user);
  const setSession = useAuthStore((s) => s.setSession);

  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      preferred_locale: (user?.preferred_locale as "en" | "hi" | "hi-Latn") || locale || "en",
    },
  });

  const onSubmit = async (values: ProfileFormValues) => {
    setLoading(true);
    setGlobalError(null);

    try {
      const payload = {
        name: values.name.trim(),
        email: values.email?.trim() ? values.email.trim() : null,
        preferred_locale: locale,
      };

      const res = await api<{ user: User; shops: MyShop[] }>("/auth/me/", {
        method: "PATCH",
        body: payload,
        shop: false,
      });

      const pending = (res as { pending_invites?: number }).pending_invites ?? useAuthStore.getState().pendingInvites;
      await setSession({ user: res.user, shops: res.shops, pendingInvites: pending });

      const target = nextRoute({
        status: "signedIn",
        hasName: Boolean(res.user?.name && res.user.name.trim().length >= 2),
        shopCount: res.shops?.length ?? 0,
        pendingInvites: pending,
      });

      router.replace(target ?? "/home/");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.fields) {
          if (err.fields.name) {
            setError("name", { message: err.fields.name[0] });
          }
          if (err.fields.email) {
            setError("email", { message: err.fields.email[0] });
          }
        }
        setGlobalError(errorMessage(tErrors, err.code) || err.message);
      } else {
        setGlobalError(t("invalidEmail"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full max-w-md mx-auto flex flex-col justify-between p-4 sm:p-6 bg-background text-foreground animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="w-full">
        {/* Language Selection Header */}
        <div className="flex items-center justify-between py-2 border-b border-neutral-100 pb-3">
          <span className="text-xs font-semibold text-neutral-500">
            {t("languagePreference")}
          </span>
          <LanguageSwitcher />
        </div>

        {/* Title & Subtitle */}
        <div className="mt-6 space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-950">
            {t("profileTitle")}
          </h1>
          <p className="text-sm text-neutral-500 leading-relaxed">
            {t("profileSubtitle")}
          </p>
        </div>

        {/* Form Fields */}
        <form id="profile-form" onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
          {/* Name Field */}
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-semibold text-neutral-800">
              {t("fullName")}
            </Label>
            <div className="relative">
              <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
              <Input
                id="name"
                {...register("name")}
                placeholder={t("namePlaceholder")}
                className="pl-10 h-12 rounded-2xl border-neutral-200 focus-visible:ring-primary/20 text-base"
                autoFocus
                disabled={loading}
              />
            </div>
            {errors.name && (
              <p className="text-xs font-semibold text-rose-600 flex items-center gap-1 mt-1 animate-in fade-in">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>
                  {errors.name.message?.startsWith("auth.")
                    ? t(errors.name.message.replace("auth.", "") as Parameters<typeof t>[0])
                    : errors.name.message}
                </span>
              </p>
            )}
          </div>

          {/* Email Field */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold text-neutral-800">
              {t("emailOptional")}
            </Label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder={t("emailPlaceholder")}
                className="pl-10 h-12 rounded-2xl border-neutral-200 focus-visible:ring-primary/20 text-base"
                disabled={loading}
              />
            </div>
            {errors.email && (
              <p className="text-xs font-semibold text-rose-600 flex items-center gap-1 mt-1 animate-in fade-in">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>
                  {errors.email.message?.startsWith("auth.")
                    ? t(errors.email.message.replace("auth.", "") as Parameters<typeof t>[0])
                    : errors.email.message}
                </span>
              </p>
            )}
          </div>

          {/* Global error banner */}
          {globalError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs font-medium text-rose-700 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{globalError}</span>
            </div>
          )}
        </form>
      </div>

      {/* Action Footer */}
      <div className="w-full pb-6 pt-4">
        <Button
          form="profile-form"
          type="submit"
          disabled={loading}
          className="w-full text-base font-semibold h-[54px] rounded-2xl"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>{t("verifying")}</span>
            </span>
          ) : (
            <span>{t("completeSetup")}</span>
          )}
        </Button>
      </div>
    </div>
  );
}
