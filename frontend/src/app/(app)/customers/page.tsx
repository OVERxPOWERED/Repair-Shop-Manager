"use client";

import React from "react";
import { Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/states/EmptyState";

export default function CustomersPage() {
  const t = useTranslations("nav");

  return (
    <div className="flex-1 flex flex-col justify-center px-4 py-8">
      <EmptyState
        icon={Users}
        title={t("customers")}
        body="Coming in the next update. View customer directory, repair histories, outstanding khata ledgers, and contact shortcuts."
      />
    </div>
  );
}
