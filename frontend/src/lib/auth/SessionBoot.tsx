"use client";

import React, { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuthStore, type MyShop, type User } from "@/lib/auth/store";
import { api } from "@/lib/api/client";
import { useServerWakeStore } from "@/lib/server-wake";
import { useLocaleStore } from "@/i18n/store";
import type { Locale } from "@/i18n/config";

export function SessionBoot({ children }: { children: React.ReactNode }) {
  const t = useTranslations("states");
  const status = useAuthStore((s) => s.status);
  const boot = useAuthStore((s) => s.boot);
  const setSession = useAuthStore((s) => s.setSession);
  const signOut = useAuthStore((s) => s.signOut);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const waking = useServerWakeStore((s) => s.waking);

  useEffect(() => {
    let mounted = true;

    async function initSession() {
      await boot();
      const currentTokens = useAuthStore.getState().tokens;
      if (currentTokens) {
        try {
          const data = await api<{ user: User; shops: MyShop[]; pending_invites?: number }>("/auth/me/", {
            shop: false,
          });
          if (!mounted) return;
          await setSession({
            user: data.user,
            shops: data.shops,
            pendingInvites: data.pending_invites ?? 0,
          });
          if (data.user?.preferred_locale) {
            const loc = data.user.preferred_locale as Locale;
            if (loc === "en" || loc === "hi" || loc === "hi-Latn") {
              setLocale(loc);
            }
          }
        } catch (err: any) {
          if (!mounted) return;
          if (err?.status === 401) {
            await signOut();
          } else {
            const currentUser = useAuthStore.getState().user;
            if (currentUser && currentUser.name?.trim().length >= 2) {
              useAuthStore.setState({ status: "signedIn" });
            } else {
              await signOut();
            }
          }
        }
      } else {
        useAuthStore.setState({ status: "signedOut" });
      }
    }

    initSession();

    return () => {
      mounted = false;
    };
  }, [boot, setSession, signOut, setLocale]);

  if (status === "booting") {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background text-foreground z-50">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300 max-w-xs px-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
            {waking ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : (
              <svg
                className="h-8 w-8"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
            )}
          </div>
          <div className="flex flex-col items-center gap-1.5 text-center">
            <h1 className="text-2xl font-bold tracking-tight">FixPro</h1>
            <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 animate-pulse">
              {waking ? t("serverWaking") : "Setting things up…"}
            </p>
            {waking && (
              <p className="text-xs text-muted-foreground mt-1 text-center animate-in fade-in duration-300">
                {t("serverWakingDesc")}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
