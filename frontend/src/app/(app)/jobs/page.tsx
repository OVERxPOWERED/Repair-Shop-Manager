"use client";

import React from "react";
import Link from "next/navigation";
import NextLink from "next/link";
import { Wrench, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/states/EmptyState";
import { Button } from "@/components/ui/button";

export default function JobsPage() {
  const t = useTranslations("nav");
  const tIntake = useTranslations("intake");

  return (
    <div className="flex-1 flex flex-col justify-center px-4 py-8 relative">
      <EmptyState
        icon={Wrench}
        title={t("jobs")}
        body="Track active repairs, technician assignments, repair statuses, and thermal print tags."
        action={
          <NextLink href="/jobs/new/">
            <Button className="mt-2 h-11 px-6 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-bold shadow-md shadow-sky-500/20">
              <Plus className="w-4 h-4 mr-1.5" />
              {tIntake("newJobSheetTitle")}
            </Button>
          </NextLink>
        }
      />

      {/* Floating Action Button */}
      <NextLink
        href="/jobs/new/"
        className="fixed right-5 bottom-24 z-20 w-14 h-14 rounded-full bg-sky-500 hover:bg-sky-600 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-sky-500/30 transition-transform"
        aria-label={tIntake("newJobSheetTitle")}
      >
        <Plus className="w-6 h-6" />
      </NextLink>
    </div>
  );
}
