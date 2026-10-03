"use client";

import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Store, Check, Plus } from "lucide-react";
import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useAuthStore } from "@/lib/auth/store";
import { cn } from "@/lib/utils";

interface ShopSwitcherProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShopSwitcher({ open, onOpenChange }: ShopSwitcherProps) {
  const queryClient = useQueryClient();
  const { shops, shopId, selectShop } = useAuthStore();

  const handleSelect = async (newShopId: string) => {
    if (newShopId === shopId) {
      onOpenChange(false);
      return;
    }
    await selectShop(newShopId);
    queryClient.clear();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-w-md mx-auto p-5 pb-8">
        <SheetHeader className="text-left pb-3 border-b border-neutral-100">
          <SheetTitle className="text-lg font-bold">Switch Shop</SheetTitle>
          <SheetDescription className="text-xs text-neutral-500">
            Select a branch or workshop to manage
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-2 max-h-[60vh] overflow-y-auto">
          {shops.map((s) => {
            const isSelected = s.shop_id === shopId;
            return (
              <button
                key={s.shop_id}
                type="button"
                onClick={() => handleSelect(s.shop_id)}
                className={cn(
                  "w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all text-left",
                  isSelected
                    ? "border-primary bg-primary/5 text-primary shadow-sm"
                    : "border-neutral-200/80 hover:bg-neutral-50 text-neutral-800"
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl",
                      isSelected ? "bg-primary text-primary-foreground" : "bg-neutral-100 text-neutral-600"
                    )}
                  >
                    <Store className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold leading-tight">{s.shop_name}</h4>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      {s.city ? `${s.city} • ` : ""}
                      <span className="capitalize">{s.role_name}</span>
                    </p>
                  </div>
                </div>

                {isSelected && (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })}

          <Link
            href="/onboarding/"
            onClick={() => onOpenChange(false)}
            className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-dashed border-neutral-300 text-neutral-600 hover:bg-neutral-50 hover:border-neutral-400 transition-colors text-sm font-semibold mt-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500">
              <Plus className="h-5 w-5" />
            </div>
            <span>Add another shop</span>
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
