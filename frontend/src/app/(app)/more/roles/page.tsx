"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRolesList, type Role } from "@/features/staff/api";
import { ListSkeleton } from "@/components/states";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Check } from "lucide-react";

export default function RolesPage() {
  const router = useRouter();
  const t = useTranslations("roles");
  const tPerms = useTranslations("permissions");

  const { data: roles = [], isLoading } = useRolesList();

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl h-10 w-10">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold tracking-tight">{t("title")}</h1>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        <p className="text-xs text-muted-foreground px-1">{t("subtitle")}</p>

        {isLoading ? (
          <ListSkeleton rows={4} />
        ) : (
          <div className="space-y-4">
            {roles.map((role: Role) => {
              const perms = role.permissions || [];
              return (
                <div key={role.id} className="rounded-2xl border bg-card p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Shield className="h-4 w-4" />
                      </div>
                      <span className="font-bold text-base text-foreground">{role.name}</span>
                    </div>
                    {role.is_system && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                        {t("systemBadge")}
                      </span>
                    )}
                  </div>

                  <div className="border-t pt-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                      {t("permissionsHeader", { count: perms.length })}
                    </span>
                    <div className="grid grid-cols-1 gap-1.5">
                      {perms.map((permCode) => {
                        let label = permCode;
                        try {
                          // Try translating permission code
                          label = tPerms(permCode as never);
                        } catch {
                          label = permCode;
                        }
                        return (
                          <div key={permCode} className="flex items-center gap-2 text-xs text-foreground/80">
                            <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span>{label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
