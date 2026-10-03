"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/auth/store";
import { nextRoute } from "@/lib/auth/route";
import { onBackButton, minimizeApp } from "@/native/app";
import { setAppStatusBar } from "@/native/status-bar";
import { AppHeader } from "@/components/shell/AppHeader";
import { BottomNav } from "@/components/shell/BottomNav";
import { OfflineBanner } from "@/components/states/OfflineBanner";
import { ServerWakeBanner } from "@/components/states/ServerWakeBanner";
import { Loader2 } from "lucide-react";

const TAB_ROOTS = [
  "/home",
  "/home/",
  "/jobs",
  "/jobs/",
  "/customers",
  "/customers/",
  "/inventory",
  "/inventory/",
  "/more",
  "/more/",
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  // 1. Status bar configuration on native
  useEffect(() => {
    setAppStatusBar();
  }, []);

  // 2. Android hardware back button handler
  useEffect(() => {
    const unsubscribe = onBackButton(() => {
      if (TAB_ROOTS.includes(pathname)) {
        minimizeApp();
      } else {
        router.back();
      }
    });
    return () => unsubscribe();
  }, [pathname, router]);

  const { status, user, shops, pendingInvites } = useAuthStore();

  // 3. Routing protection
  const target = nextRoute({
    status,
    hasName: Boolean(user?.name && user.name.trim().length >= 2),
    shopCount: shops.length,
    pendingInvites,
  });

  useEffect(() => {
    if (target && target !== "/home/") {
      router.replace(target);
    }
  }, [target, router]);

  if (target && target !== "/home/") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full max-w-md mx-auto flex flex-col bg-background text-foreground">
      <AppHeader />
      <OfflineBanner />
      <ServerWakeBanner />
      <main className="flex-1 pb-20">{children}</main>
      <BottomNav />
    </div>
  );
}
