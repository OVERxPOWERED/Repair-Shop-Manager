"use client";

import React from "react";
import { Package } from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/states/EmptyState";

export default function InventoryPage() {
  const t = useTranslations("nav");

  return (
    <div className="flex-1 flex flex-col justify-center px-4 py-8">
      <EmptyState
        icon={Package}
        title={t("inventory")}
        body="Coming in the next update. Track spare parts, low stock reorders, suppliers, and purchase history."
      />
    </div>
  );
}
