"use client";

import React from "react";
import { Wrench } from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/states/EmptyState";

export default function JobsPage() {
  const t = useTranslations("nav");

  return (
    <div className="flex-1 flex flex-col justify-center px-4 py-8">
      <EmptyState
        icon={Wrench}
        title={t("jobs")}
        body="Coming in the next update. Manage intake, technician assignments, repair statuses, and thermal print tags."
      />
    </div>
  );
}
