"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Wrench, FileText, Printer, MessageSquare } from "lucide-react";
import { useAuthStore } from "@/lib/auth/store";
import { nextRoute } from "@/lib/auth/route";

export default function SplashPage() {
  const router = useRouter();
  const t = useTranslations("auth");
  const { status, user, shops, pendingInvites } = useAuthStore();

  useEffect(() => {
    if (status === "booting") return;

    const target = nextRoute({
      status,
      hasName: Boolean(user?.name && user.name.trim().length >= 2),
      shopCount: shops.length,
      pendingInvites,
    });

    if (target) {
      router.replace(target);
    }
  }, [status, user, shops, pendingInvites, router]);

  return (
    <div className="min-h-screen w-full max-w-md mx-auto flex flex-col justify-between items-center p-6 bg-background text-foreground animate-in fade-in duration-300">
      <div className="w-full" />

      {/* Center Branding */}
      <div className="flex flex-col items-center gap-6">
        <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-neutral-950 text-white shadow-xl shadow-neutral-950/20 ring-1 ring-neutral-900">
          <Wrench className="h-12 w-12 text-white" />
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-tr from-neutral-800 to-transparent -z-10 opacity-40 blur-sm" />
        </div>

        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight">FixPro</h1>
          <p className="text-sm font-medium text-neutral-500 animate-pulse">
            {t("settingUp")}
          </p>
        </div>
      </div>

      {/* Feature Pills */}
      <div className="w-full flex flex-col gap-2.5 pb-8">
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-neutral-50 border border-neutral-200/80 text-neutral-800 text-sm font-medium shadow-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-200 text-neutral-800">
            <FileText className="h-4 w-4" />
          </div>
          <span>{t("pillJobSheets")}</span>
        </div>

        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-neutral-50 border border-neutral-200/80 text-neutral-800 text-sm font-medium shadow-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-200 text-neutral-800">
            <Printer className="h-4 w-4" />
          </div>
          <span>{t("pillThermal")}</span>
        </div>

        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-neutral-50 border border-neutral-200/80 text-neutral-800 text-sm font-medium shadow-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-200 text-neutral-800">
            <MessageSquare className="h-4 w-4" />
          </div>
          <span>{t("pillWhatsApp")}</span>
        </div>
      </div>
    </div>
  );
}
