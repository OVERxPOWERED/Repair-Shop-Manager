"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Clock, AlertCircle, ArrowRight, Loader2, KeyRound } from "lucide-react";
import { useCurrentShop, useAuthStore, type MyShop } from "@/lib/auth/store";
import { useJoinShopWithCode } from "./api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { api } from "@/lib/api/client";
import { toast } from "sonner";
import { errorMessage } from "@/i18n/errorMessage";

export function JoinRequestBanner() {
  const t = useTranslations("staff");
  const tOnboarding = useTranslations("onboarding");
  const currentShop = useCurrentShop();
  const { user, setSession, selectShop } = useAuthStore();

  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const joinMutation = useJoinShopWithCode();

  if (!currentShop) return null;

  const isPending = currentShop.status === "requested";
  const isDeclined = currentShop.status === "removed";

  if (!isPending && !isDeclined) return null;

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newCode.trim().toUpperCase();
    if (!clean) return;

    try {
      setError(null);
      const res = await joinMutation.mutateAsync(clean);
      toast.success(tOnboarding("joinSuccess"));
      setCodeModalOpen(false);
      setNewCode("");

      if (user) {
        try {
          const me = await api<{ shops: MyShop[] }>("/auth/me/", { shop: false });
          await setSession({ user, shops: me.shops });
          await selectShop(res.shop_id);
        } catch {
          await selectShop(res.shop_id);
        }
      }
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <>
      {isPending && (
        <div className="bg-amber-50 dark:bg-amber-950/70 border-b border-amber-200 dark:border-amber-900 px-4 py-2.5 flex items-center justify-between gap-3 text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2 text-xs font-medium">
            <Clock className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span className="line-clamp-2 leading-tight">
              {t("pendingApprovalBanner")}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCodeModalOpen(true)}
            className="shrink-0 h-7 text-[11px] font-bold border-amber-300 dark:border-amber-800 bg-white dark:bg-amber-950 px-2.5 rounded-lg"
          >
            {tOnboarding("enterCodeLabel")}
          </Button>
        </div>
      )}

      {isDeclined && (
        <div className="bg-red-50 dark:bg-red-950/70 border-b border-red-200 dark:border-red-900 px-4 py-2.5 flex items-center justify-between gap-3 text-red-900 dark:text-red-200">
          <div className="flex items-center gap-2 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
            <span className="line-clamp-2 leading-tight">
              {t("requestDeclinedBanner")}
            </span>
          </div>
          <Button
            size="sm"
            onClick={() => setCodeModalOpen(true)}
            className="shrink-0 h-7 text-[11px] font-bold bg-red-600 hover:bg-red-700 text-white px-2.5 rounded-lg"
          >
            {tOnboarding("enterCodeLabel")}
          </Button>
        </div>
      )}

      {/* Re-enter Code Modal */}
      <Dialog open={codeModalOpen} onOpenChange={setCodeModalOpen}>
        <DialogContent className="max-w-sm rounded-3xl p-6">
          <DialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-2">
              <KeyRound className="w-6 h-6" />
            </div>
            <DialogTitle className="text-lg font-bold">
              {tOnboarding("enterCodeLabel")}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {tOnboarding("enterCodeHint")}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleJoinSubmit} className="space-y-4 pt-2">
            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-2.5 text-xs font-medium text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Input
              type="text"
              maxLength={10}
              placeholder={tOnboarding("enterCodePlaceholder")}
              value={newCode}
              onChange={(e) => {
                setNewCode(e.target.value.toUpperCase());
                setError(null);
              }}
              autoFocus
              className="h-12 text-center text-lg font-mono font-bold tracking-widest uppercase rounded-2xl"
            />

            <Button
              type="submit"
              disabled={joinMutation.isPending || !newCode.trim()}
              className="w-full h-11 rounded-xl text-xs font-bold gap-2"
            >
              {joinMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{tOnboarding("joining")}</span>
                </>
              ) : (
                <>
                  <span>{tOnboarding("joinBtn")}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
