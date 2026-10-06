"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Store, Users, ArrowRight, Wrench, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore, type MyShop } from "@/lib/auth/store";
import { useJoinShopWithCode } from "@/features/staff/api";
import { api } from "@/lib/api/client";
import { toast } from "sonner";
import { errorMessage } from "@/i18n/errorMessage";

export default function OnboardingChoicePage() {
  const router = useRouter();
  const t = useTranslations("onboarding");
  const tCommon = useTranslations("common");
  const { user, shops, setSession, selectShop } = useAuthStore();

  const [selectedRole, setSelectedRole] = useState<"owner" | "employee" | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const joinMutation = useJoinShopWithCode();

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = joinCode.trim().toUpperCase();
    if (!clean) {
      setFormError(t("enterCodeHint"));
      return;
    }

    try {
      setFormError(null);
      const res = await joinMutation.mutateAsync(clean);
      toast.success(t("joinSuccess"));

      // Refresh auth profile to pull newly requested membership into shops list
      if (user) {
        try {
          const me = await api<{ shops: MyShop[] }>("/auth/me/", { shop: false });
          await setSession({
            user,
            shops: me.shops || [
              {
                membership_id: res.membership_id,
                shop_id: res.shop_id,
                shop_name: res.shop_name,
                shop_type: "mobile",
                city: "",
                status: res.status,
                role_id: null,
                role_name: "Pending Approval",
                permissions: [],
              },
            ],
          });
          await selectShop(res.shop_id);
        } catch {
          // If me fails, set minimal session with the joined shop
          await setSession({
            user,
            shops: [
              {
                membership_id: res.membership_id,
                shop_id: res.shop_id,
                shop_name: res.shop_name,
                shop_type: "mobile",
                city: "",
                status: res.status,
                role_id: null,
                role_name: "Pending Approval",
                permissions: [],
              },
            ],
          });
          await selectShop(res.shop_id);
        }
      }

      router.replace("/home/");
    } catch (err) {
      setFormError(errorMessage(err));
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between p-6">
      <div className="max-w-md w-full mx-auto space-y-6">
        {/* Brand Header */}
        <div className="flex items-center justify-between pt-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-foreground block">FixPro</span>
              <span className="text-xs text-muted-foreground">{t("choiceSubtitle")}</span>
            </div>
          </div>

          {shops.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.replace("/home/")}
              className="rounded-xl text-xs"
            >
              {tCommon("close")}
            </Button>
          )}
        </div>

        {/* Title & Greeting */}
        <div className="space-y-1.5 pt-2">
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <span>{t("choiceTitle")}</span>
            <Sparkles className="w-5 h-5 text-amber-500 fill-amber-500 inline" />
          </h1>
          <p className="text-sm text-muted-foreground">
            {user?.name ? `${user.name}, ` : ""}
            {t("choiceSubtitle")}
          </p>
        </div>

        {/* Option 1: Shop Owner */}
        <div
          onClick={() => {
            setSelectedRole("owner");
            router.push("/onboarding/");
          }}
          className={`p-5 rounded-3xl border-2 cursor-pointer transition-all ${
            selectedRole === "owner"
              ? "border-primary bg-primary/5 shadow-md"
              : "border-border bg-card hover:border-neutral-300 dark:hover:border-neutral-700"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  {t("ownerCardBadge")}
                </span>
                <h2 className="text-base font-bold text-foreground">
                  {t("ownerCardTitle")}
                </h2>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground mt-2" />
          </div>
          <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
            {t("ownerCardDesc")}
          </p>
          <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs font-semibold text-primary">
            <span>{t("ownerCardCta")}</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>

        {/* Option 2: Employee / Technician */}
        <div
          onClick={() => setSelectedRole("employee")}
          className={`p-5 rounded-3xl border-2 transition-all ${
            selectedRole === "employee"
              ? "border-primary bg-primary/5 shadow-md"
              : "border-border bg-card hover:border-neutral-300 dark:hover:border-neutral-700 cursor-pointer"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  {t("employeeCardBadge")}
                </span>
                <h2 className="text-base font-bold text-foreground">
                  {t("employeeCardTitle")}
                </h2>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
            {t("employeeCardDesc")}
          </p>

          {/* Expanded Code Input when employee selected */}
          {selectedRole === "employee" && (
            <form onSubmit={handleJoinSubmit} className="mt-5 pt-4 border-t border-border space-y-4">
              {formError && (
                <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-xs font-medium text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="master-join-code" className="text-xs font-semibold">
                  {t("enterCodeLabel")}
                </Label>
                <Input
                  id="master-join-code"
                  type="text"
                  maxLength={10}
                  placeholder={t("enterCodePlaceholder")}
                  value={joinCode}
                  onChange={(e) => {
                    setJoinCode(e.target.value.toUpperCase());
                    setFormError(null);
                  }}
                  autoFocus
                  className="h-12 text-center text-lg font-mono font-bold tracking-widest uppercase rounded-2xl bg-background"
                />
                <p className="text-[11px] text-muted-foreground">
                  {t("enterCodeHint")}
                </p>
              </div>

              <Button
                type="submit"
                disabled={joinMutation.isPending || !joinCode.trim()}
                className="w-full h-12 rounded-2xl text-xs font-bold gap-2"
              >
                {joinMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t("joining")}</span>
                  </>
                ) : (
                  <>
                    <span>{t("joinBtn")}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          )}
        </div>
      </div>

      <div className="text-center py-4">
        <p className="text-[11px] text-muted-foreground">FixPro Multi-Tenant Repair Management</p>
      </div>
    </div>
  );
}
