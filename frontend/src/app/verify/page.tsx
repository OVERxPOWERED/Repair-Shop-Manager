"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OtpInput } from "@/components/forms/OtpInput";
import { api, ApiError } from "@/lib/api/client";
import { getDeviceId } from "@/native/device";
import { platform } from "@/native/platform";
import { env } from "@/lib/env";
import { useAuthStore, type User, type MyShop, type Tokens } from "@/lib/auth/store";
import { nextRoute } from "@/lib/auth/route";
import { errorMessage } from "@/i18n/config";
import { formatPhone } from "@/lib/format/phone";

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("auth");
  const tErrors = useTranslations("errors");
  const setSession = useAuthStore((s) => s.setSession);

  const phone = searchParams.get("phone") || "";
  const initialCooldown = parseInt(searchParams.get("cooldown") || "30", 10);

  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(isNaN(initialCooldown) ? 30 : initialCooldown);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [attemptsMsg, setAttemptsMsg] = useState<string | null>(null);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleVerify = React.useCallback(
    async (otpCode: string) => {
      if (otpCode.length !== 6 || loading || !phone) return;

      setLoading(true);
      setErrorMsg(null);
      setAttemptsMsg(null);

      try {
        const deviceId = await getDeviceId();
        const currentPlatform = platform();

        const data = await api<{ user: User; tokens: Tokens; shops: MyShop[] }>("/auth/otp/verify/", {
          method: "POST",
          body: {
            phone,
            code: otpCode,
            device_id: deviceId,
            platform: currentPlatform,
            app_version: env.appVersion,
          },
          auth: false,
          shop: false,
        });

        await setSession({ user: data.user, tokens: data.tokens, shops: data.shops });

        const target = nextRoute({
          status: "signedIn",
          hasName: Boolean(data.user?.name && data.user.name.trim().length >= 2),
          shopCount: data.shops?.length ?? 0,
          pendingInvites: 0,
        });

        router.replace(target ?? "/home/");
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.code === "otp.invalid") {
            const fieldErr = err.fields?.code?.[0];
            if (fieldErr) {
              setAttemptsMsg(fieldErr);
            } else {
              setErrorMsg(t("invalidOtp"));
            }
          } else if (err.code === "otp.expired") {
            setErrorMsg(errorMessage(tErrors, "otp.expired"));
          } else if (err.code === "otp.locked") {
            setErrorMsg(errorMessage(tErrors, "otp.locked"));
          } else {
            setErrorMsg(errorMessage(tErrors, err.code) || err.message);
          }
        } else {
          setErrorMsg(t("invalidOtp"));
        }
      } finally {
        setLoading(false);
      }
    },
    [loading, phone, router, setSession, t, tErrors]
  );

  // Auto-submit when 6 digits are typed
  useEffect(() => {
    if (code.length === 6 && !loading) {
      handleVerify(code);
    }
  }, [code, loading, handleVerify]);

  const handleResend = async () => {
    if (cooldown > 0 || resending || !phone) return;

    setResending(true);
    setErrorMsg(null);
    setAttemptsMsg(null);

    try {
      const deviceId = await getDeviceId();
      const res = await api<{ cooldown_seconds: number; expires_at: string }>("/auth/otp/send/", {
        method: "POST",
        body: { phone, device_id: deviceId },
        auth: false,
        shop: false,
      });

      setCooldown(res?.cooldown_seconds ?? 30);
      setCode("");
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMsg(errorMessage(tErrors, err.code) || err.message);
      } else {
        setErrorMsg(t("invalidPhone"));
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen w-full max-w-md mx-auto flex flex-col justify-between p-4 sm:p-6 bg-background text-foreground animate-in fade-in duration-300">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between py-2">
          <Link
            href="/login/"
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-800 hover:bg-neutral-200 active:scale-95 transition-all"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </div>

        {/* Title & Phone Info */}
        <div className="mt-4 space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-950">
            {t("verifyTitle")}
          </h1>
          <div className="flex items-center gap-1.5 flex-wrap text-sm text-neutral-500">
            <span>{t("verifySubtitle")}</span>
            <span className="font-semibold text-neutral-900">{formatPhone(phone) || phone}</span>
            <span>•</span>
            <Link href="/login/" className="font-medium text-primary hover:underline">
              {t("wrongNumber")}
            </Link>
          </div>
        </div>

        {/* Otp Input Boxes */}
        <div className="mt-10 flex flex-col items-center">
          <OtpInput
            value={code}
            onChange={(val) => {
              setCode(val);
              setErrorMsg(null);
              setAttemptsMsg(null);
            }}
            disabled={loading}
            hasError={Boolean(errorMsg || attemptsMsg)}
          />

          {/* Error Message */}
          {errorMsg && (
            <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-rose-600 animate-in fade-in text-center">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Attempt Countdown Message */}
          {attemptsMsg && (
            <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>{attemptsMsg}</span>
            </div>
          )}

          {/* Resend Action */}
          <div className="mt-6 flex items-center justify-center">
            {cooldown > 0 ? (
              <span className="text-xs font-medium text-neutral-400">
                {t("resendIn", { seconds: cooldown })}
              </span>
            ) : (
              <button
                type="button"
                disabled={resending}
                onClick={handleResend}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1.5"
              >
                {resending ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>{t("loading")}</span>
                  </>
                ) : (
                  <span>{t("resendOtp")}</span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Verify Submit Button */}
      <div className="w-full pb-6 pt-4">
        <Button
          onClick={() => handleVerify(code)}
          disabled={code.length !== 6 || loading}
          className="w-full text-base font-semibold h-[54px] rounded-2xl"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>{t("verifying")}</span>
            </span>
          ) : (
            <span>{t("verifyOtp")}</span>
          )}
        </Button>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
