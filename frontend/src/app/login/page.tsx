"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NumericKeypad } from "@/components/forms/NumericKeypad";
import { api, ApiError } from "@/lib/api/client";
import { getDeviceId } from "@/native/device";
import { errorMessage } from "@/i18n/config";
import { GoogleSignInButton } from "@/features/auth/GoogleSignInButton";

export default function LoginPage() {
  const router = useRouter();
  const t = useTranslations("auth");
  const tErrors = useTranslations("errors");

  const [isDev, setIsDev] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("dev") === "true") {
        setIsDev(true);
      } else {
        router.replace("/welcome/");
      }
    }
  }, [router]);

  const [digits, setDigits] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (isDev !== true) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isValid = /^[6-9]\d{9}$/.test(digits);

  const handleKeyPress = (digit: string) => {
    if (digits.length < 10) {
      setErrorMsg(null);
      setDigits((prev) => prev + digit);
    }
  };

  const handleBackspace = () => {
    setErrorMsg(null);
    setDigits((prev) => prev.slice(0, -1));
  };

  const handleSubmit = async () => {
    if (!isValid || loading) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const deviceId = await getDeviceId();
      const phone = `+91${digits}`;
      const res = await api<{ cooldown_seconds: number; expires_at: string }>("/auth/otp/send/", {
        method: "POST",
        body: { phone, device_id: deviceId },
        auth: false,
        shop: false,
      });

      const cooldown = res?.cooldown_seconds ?? 30;
      router.push(`/verify/?phone=${encodeURIComponent(phone)}&cooldown=${cooldown}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMsg(errorMessage(tErrors, err.code) || err.message);
      } else {
        setErrorMsg(t("invalidPhone"));
      }
    } finally {
      setLoading(false);
    }
  };

  // Format as 5 + 5 digits: "98765 43210"
  const formattedDisplay = () => {
    if (!digits) return "";
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  };

  return (
    <div className="min-h-screen w-full max-w-md mx-auto flex flex-col justify-between p-4 sm:p-6 bg-background text-foreground animate-in fade-in duration-300">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between py-2">
          <Link
            href="/welcome/"
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-800 hover:bg-neutral-200 active:scale-95 transition-all"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </div>

        {/* Title & Prompt */}
        <div className="mt-4 space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-950 dark:text-white">
            {t("phoneTitle")}
          </h1>
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{t("phoneSubtitle")}</p>
        </div>

        {/* SMS notice banner */}
        <div className="mt-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
          <div className="space-y-2 flex-1">
            <span>{t("smsDevNotice")}</span>
            <GoogleSignInButton className="h-9 text-xs font-semibold py-1 mt-1" />
          </div>
        </div>

        {/* Phone Display Box */}
        <div className="mt-6 flex flex-col items-center">
          <div className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl border-2 border-neutral-200 bg-neutral-50/50">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-neutral-200 text-sm font-bold text-neutral-900 shadow-sm">
              <span>🇮🇳</span>
              <span className="text-neutral-900 font-bold">+91</span>
            </span>

            <div className="text-2xl sm:text-3xl font-bold tracking-wider tabular-nums min-h-[36px] flex items-center">
              {digits ? (
                <span className="text-neutral-950 dark:text-white">{formattedDisplay()}</span>
              ) : (
                <span className="text-neutral-600 font-bold" aria-hidden="true">00000 00000</span>
              )}
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-rose-600 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      </div>

      {/* Numeric Keypad & Submit */}
      <div className="w-full space-y-4 pt-4 pb-2">
        <NumericKeypad
          onKeyPress={handleKeyPress}
          onBackspace={handleBackspace}
          disabled={loading}
        />

        <Button
          onClick={handleSubmit}
          disabled={!isValid || loading}
          className="w-full text-base font-semibold h-[54px] rounded-2xl"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>{t("verifying")}</span>
            </span>
          ) : (
            <span>{t("getOtp")}</span>
          )}
        </Button>
      </div>
    </div>
  );
}
