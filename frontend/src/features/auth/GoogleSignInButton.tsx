"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signInWithGoogle, renderGoogleButton, type GoogleUserCredentials } from "@/native/google-auth";
import { getDeviceId } from "@/native/device";
import { platform } from "@/native/platform";
import { env } from "@/lib/env";
import { api, ApiError } from "@/lib/api/client";
import { useAuthStore, type User, type MyShop, type Tokens } from "@/lib/auth/store";
import { nextRoute } from "@/lib/auth/route";

interface GoogleSignInButtonProps {
  className?: string;
  onError?: (msg: string) => void;
}

export function GoogleSignInButton({ className = "", onError }: GoogleSignInButtonProps) {
  const router = useRouter();
  const t = useTranslations("auth");
  const setSession = useAuthStore((s) => s.setSession);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [gisRendered, setGisRendered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const processGoogleCredential = useCallback(
    async (credentials: GoogleUserCredentials) => {
      if (loading) return;
      setErrorMessage(null);
      setLoading(true);

      try {
        const deviceId = await getDeviceId();
        const currentPlatform = platform();

        const data = await api<{ user: User; tokens: Tokens; shops: MyShop[]; pending_invites?: number }>(
          "/auth/google/",
          {
            method: "POST",
            body: {
              id_token: credentials.idToken,
              device_id: deviceId,
              platform: currentPlatform,
              app_version: env.appVersion,
            },
            auth: false,
            shop: false,
          }
        );

        const pending = data.pending_invites ?? 0;
        await setSession({
          user: data.user,
          tokens: data.tokens,
          shops: data.shops,
          pendingInvites: pending,
        });

        const target = nextRoute({
          status: "signedIn",
          hasName: Boolean(data.user?.name && data.user.name.trim().length >= 2),
          shopCount: data.shops?.length ?? 0,
          pendingInvites: pending,
        });

        router.replace(target ?? "/home/");
      } catch (err: any) {
        const msg =
          err instanceof ApiError
            ? err.message || t("googleFailed")
            : err?.message !== "Sign in cancelled"
            ? err?.message || t("googleFailed")
            : null;
        if (msg) {
          setErrorMessage(msg);
          onError?.(msg);
        }
      } finally {
        setLoading(false);
      }
    },
    [loading, onError, router, setSession, t]
  );

  useEffect(() => {
    let mounted = true;
    if (containerRef.current && env.googleClientId) {
      renderGoogleButton(
        containerRef.current,
        (creds) => {
          if (mounted) {
            processGoogleCredential(creds);
          }
        },
        (err) => {
          if (mounted) {
            setGisRendered(false);
          }
        }
      ).then((success) => {
        if (mounted && success) {
          setGisRendered(true);
        }
      });
    }
    return () => {
      mounted = false;
    };
  }, [processGoogleCredential]);

  const handleCustomClick = async () => {
    if (loading) return;
    setErrorMessage(null);
    try {
      const credentials = await signInWithGoogle();
      await processGoogleCredential(credentials);
    } catch (err: any) {
      if (err?.message !== "Sign in cancelled") {
        const msg = err instanceof ApiError ? err.message : (err?.message || t("googleFailed"));
        setErrorMessage(msg);
        onError?.(msg);
      }
    }
  };

  return (
    <div className={`w-full space-y-2.5 ${className}`}>
      {/* Official GIS Button container */}
      <div
        ref={containerRef}
        className={`w-full flex justify-center items-center ${gisRendered && !loading ? "block" : "hidden"}`}
      />

      {/* Fallback button shown during loading or when GIS is unavailable/dev mode */}
      {(!gisRendered || loading) && (
        <Button
          type="button"
          variant="outline"
          onClick={handleCustomClick}
          disabled={loading}
          className="w-full h-12 rounded-2xl border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-900 font-semibold flex items-center justify-center gap-3 shadow-sm hover:shadow active:scale-[0.99] transition-all text-base"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-neutral-600" />
          ) : (
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.87c2.27-2.09 3.675-5.17 3.675-9.15z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.87-3.05c-1.08.72-2.45 1.16-4.06 1.16-3.13 0-5.78-2.11-6.73-4.96H1.27v3.16C3.29 21.36 7.37 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.6H1.27C.46 8.22 0 10.06 0 12s.46 3.78 1.27 5.4l4-3.16z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.29 2.64 1.27 6.6l4 3.16c.95-2.85 3.6-4.96 6.73-4.96z"
              />
            </svg>
          )}
          <span>{loading ? t("verifying") : t("continueGoogle")}</span>
        </Button>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-center text-xs text-destructive font-medium animate-in fade-in"
        >
          {errorMessage}
        </div>
      )}
    </div>
  );
}
