"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Wrench, ChevronDown, Bell } from "lucide-react";
import { useAuthStore, useCurrentShop } from "@/lib/auth/store";
import { ShopSwitcher } from "./ShopSwitcher";

export function AppHeader() {
  const currentShop = useCurrentShop();
  const { shops, user } = useAuthStore();
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const hasMultipleShops = shops.length > 1;

  const initials = user?.name
    ? user.name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join("")
    : "FP";

  const shopTypeLabel = currentShop?.shop_type
    ? `${currentShop.shop_type.charAt(0).toUpperCase() + currentShop.shop_type.slice(1)} Repair Shop`
    : "Repair Shop";

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-neutral-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-neutral-950 flex items-center justify-center text-white shadow-sm shrink-0">
            <Wrench className="w-5 h-5 text-white" />
          </div>

          <div>
            {hasMultipleShops ? (
              <button
                type="button"
                onClick={() => setSwitcherOpen(true)}
                className="flex items-center gap-1 text-sm font-bold text-neutral-950 hover:opacity-80 transition-opacity"
              >
                <span className="truncate max-w-[160px] sm:max-w-[200px]">
                  {currentShop?.shop_name || "FixPro Shop"}
                </span>
                <ChevronDown className="w-4 h-4 text-neutral-500 shrink-0" />
              </button>
            ) : (
              <h2 className="text-sm font-bold text-neutral-950 truncate max-w-[180px] sm:max-w-[240px]">
                {currentShop?.shop_name || "FixPro Shop"}
              </h2>
            )}
            <p className="text-[11px] text-neutral-500 font-medium">{shopTypeLabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            aria-label="Notifications"
            className="w-9 h-9 rounded-full bg-neutral-50 border border-neutral-200/80 flex items-center justify-center text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <Bell className="w-4 h-4" />
          </button>

          <Link
            href="/more/"
            className="w-9 h-9 rounded-full bg-neutral-950 text-white font-bold text-xs flex items-center justify-center shadow-sm hover:opacity-90 transition-opacity"
            aria-label="User Profile and More Menu"
          >
            {initials}
          </Link>
        </div>
      </header>

      {hasMultipleShops && (
        <ShopSwitcher open={switcherOpen} onOpenChange={setSwitcherOpen} />
      )}
    </>
  );
}
