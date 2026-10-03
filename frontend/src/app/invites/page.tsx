"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@/lib/auth/store";
import { useMyInvites, useAcceptInvite, useDeclineInvite, type MyInvite } from "@/features/staff/api";
import { ListSkeleton, EmptyState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Wrench, Mail, Check, X, Loader2, Store, Shield } from "lucide-react";
import { toast } from "sonner";
import { errorMessage } from "@/i18n/errorMessage";

export default function InvitesPage() {
  const router = useRouter();
  const t = useTranslations("invites");
  const tCommon = useTranslations("common");

  const { user, shops, setSession } = useAuthStore();
  const { data: invites = [], isLoading, refetch } = useMyInvites();

  const acceptMutation = useAcceptInvite();
  const declineMutation = useDeclineInvite();

  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleAccept = async (invite: MyInvite) => {
    if (!user) return;
    try {
      setProcessingId(invite.id);
      const newShops = await acceptMutation.mutateAsync(invite.id);
      toast.success(t("acceptedSuccess", { shop: invite.shop_name }));
      await setSession({
        user,
        shops: newShops,
        pendingInvites: Math.max(0, invites.length - 1),
      });
      router.replace("/home/");
    } catch (err) {
      toast.error(errorMessage(err));
      setProcessingId(null);
    }
  };

  const handleDecline = async (invite: MyInvite) => {
    try {
      setProcessingId(invite.id);
      await declineMutation.mutateAsync(invite.id);
      toast.success(t("declinedSuccess"));
      await refetch();
      setProcessingId(null);
    } catch (err) {
      toast.error(errorMessage(err));
      setProcessingId(null);
    }
  };

  const handleSkipOrContinue = () => {
    if (shops.length > 0) {
      router.replace("/home/");
    } else {
      router.replace("/onboarding/");
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
              <span className="text-xs text-muted-foreground">{t("headerSubtitle")}</span>
            </div>
          </div>

          {shops.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => router.replace("/home/")} className="rounded-xl text-xs">
              {t("goToHome")}
            </Button>
          )}
        </div>

        {/* Title */}
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>

        {/* Invites Cards */}
        {isLoading ? (
          <ListSkeleton rows={3} />
        ) : invites.length === 0 ? (
          <div className="py-8">
            <EmptyState
              icon={Mail}
              title={t("emptyTitle")}
              body={t("emptyBody")}
              action={
                <Button onClick={handleSkipOrContinue} className="rounded-xl">
                  {shops.length > 0 ? t("goToHome") : t("createShopCta")}
                </Button>
              }
            />
          </div>
        ) : (
          <div className="space-y-4">
            {invites.map((inv: MyInvite) => {
              const isBusy = processingId === inv.id;
              return (
                <div
                  key={inv.id}
                  className="rounded-3xl border bg-card p-5 shadow-sm space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shrink-0 mt-0.5">
                      <Store className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-base text-foreground leading-snug">{inv.shop_name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {t("invitedByText", { inviter: inv.inviter_name || t("shopOwner") })}
                      </p>
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs font-semibold text-foreground/80 mt-1">
                        <Shield className="h-3 w-3 text-primary" />
                        <span>{inv.role_name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => handleDecline(inv)}
                      className="flex-1 rounded-xl h-11 text-xs font-semibold text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4 mr-1.5" />
                      {t("declineBtn")}
                    </Button>

                    <Button
                      size="sm"
                      disabled={isBusy}
                      onClick={() => handleAccept(inv)}
                      className="flex-1 rounded-xl h-11 text-xs font-semibold shadow-md shadow-primary/20"
                    >
                      {isBusy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-1.5" />
                          {t("acceptBtn")}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer skip if user has 0 shops */}
      {shops.length === 0 && invites.length > 0 && (
        <div className="max-w-md w-full mx-auto pt-6 text-center">
          <Button
            variant="ghost"
            onClick={() => router.replace("/onboarding/")}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {t("skipToOnboarding")}
          </Button>
        </div>
      )}
    </div>
  );
}
