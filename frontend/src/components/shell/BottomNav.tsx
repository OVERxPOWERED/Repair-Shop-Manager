"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Wrench,
  Users,
  Package,
  Grid,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  const tabs = [
    { href: "/home/", label: t("home"), icon: LayoutDashboard },
    { href: "/jobs/", label: t("jobs"), icon: Wrench },
    { href: "/customers/", label: t("customers"), icon: Users },
    { href: "/inventory/", label: t("inventory"), icon: Package },
    { href: "/more/", label: t("more"), icon: Grid },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-md border-t border-neutral-200/80 px-2 flex items-center justify-around z-40 h-16 pb-[env(safe-area-inset-bottom,0px)]"
      aria-label="Main Navigation"
    >
      {tabs.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || (href !== "/home/" && pathname.startsWith(href));

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center justify-center min-h-[48px] min-w-[48px] px-2 py-1 rounded-xl transition-all",
              isActive
                ? "text-neutral-950 font-bold"
                : "text-neutral-600 hover:text-neutral-900 font-medium"
            )}
          >
            <Icon
              className={cn(
                "h-5 w-5 transition-transform",
                isActive ? "stroke-[2.25] scale-105" : "stroke-[1.75]"
              )}
            />
            <span className="text-[10px] mt-0.5 tracking-tight">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
