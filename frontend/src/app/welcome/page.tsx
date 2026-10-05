"use client";

import React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Smartphone, ArrowRight, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";
import { GoogleSignInButton } from "@/features/auth/GoogleSignInButton";

export default function WelcomePage() {
  const t = useTranslations("auth");

  return (
    <div className="min-h-screen w-full max-w-md mx-auto flex flex-col justify-between p-6 bg-background text-foreground animate-in fade-in duration-300">
      {/* Top Bar with Language Selector */}
      <div className="flex justify-end pt-2">
        <LanguageSwitcher />
      </div>

      {/* Hero Illustration & Pitch */}
      <div className="flex flex-col items-center gap-6 my-auto text-center px-2">
        <div className="relative flex h-32 w-32 items-center justify-center rounded-3xl bg-neutral-900 text-white shadow-2xl shadow-neutral-950/20">
          <Smartphone className="h-16 w-16 text-neutral-100" />
          <div className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md ring-4 ring-background">
            <Zap className="h-5 w-5" />
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-extrabold tracking-tight text-neutral-950 sm:text-4xl">
            {t("welcome")}
          </h1>
          <p className="text-sm text-neutral-600 leading-relaxed max-w-xs mx-auto">
            {t("welcomeSubtitle")}
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200/80">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Trusted by 500+ Indian repair shops</span>
        </div>
      </div>

      {/* Action Footer */}
      <div className="w-full pb-6 pt-4 space-y-3">
        <GoogleSignInButton />

        <div className="relative flex items-center justify-center py-1">
          <div className="border-t border-neutral-200 w-full" />
          <span className="bg-background px-2 text-xs text-neutral-600 font-bold uppercase tracking-wider absolute">
            {t("orDivider")}
          </span>
        </div>

        <Button
          asChild
          variant="outline"
          className="w-full text-base font-semibold group flex items-center justify-center gap-2 h-12 rounded-2xl border-neutral-200"
        >
          <Link href="/login/">
            <Smartphone className="h-4 w-4 text-neutral-500" />
            <span>{t("continuePhone")}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 ml-1">
              {t("comingSoonBadge")}
            </span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
