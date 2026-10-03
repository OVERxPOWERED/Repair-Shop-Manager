import React from "react";
import { ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";

export function PermissionDenied() {
  const t = useTranslations("errors");

  return (
    <div className="flex flex-col items-center justify-center text-center p-8 my-auto min-h-[280px] animate-in fade-in duration-300">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-50 text-amber-600 border border-amber-200 mb-4 shadow-sm">
        <ShieldAlert className="h-8 w-8 stroke-[1.75]" />
      </div>
      <h3 className="text-lg font-bold tracking-tight text-neutral-900">
        {t("permission.denied")}
      </h3>
      <p className="text-xs text-neutral-500 mt-1 max-w-xs leading-relaxed">
        You don&apos;t have access to this. Ask the shop owner.
      </p>
    </div>
  );
}
