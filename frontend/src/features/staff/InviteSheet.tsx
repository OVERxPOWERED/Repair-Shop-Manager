"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useCreateInvite, useRolesList } from "./api";
import { errorMessage } from "@/i18n/errorMessage";
import { Loader2, UserPlus, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface InviteSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteSheet({ open, onOpenChange }: InviteSheetProps) {
  const t = useTranslations("staff");
  const tCommon = useTranslations("common");
  const [phone, setPhone] = useState("");
  const [roleId, setRoleId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const { data: roles = [], isLoading: isLoadingRoles } = useRolesList();
  const assignableRoles = roles.filter((r) => r.name !== "Owner");

  const createInviteMutation = useCreateInvite();

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 10);
    setPhone(raw);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length !== 10) {
      setError(t("phoneInvalid"));
      return;
    }
    if (!roleId) {
      setError(t("selectRoleError"));
      return;
    }

    try {
      setError(null);
      await createInviteMutation.mutateAsync({
        phone: `+91${phone}`,
        role_id: roleId,
      });
      toast.success(t("inviteSentSuccess"));
      setPhone("");
      setRoleId("");
      onOpenChange(false);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] overflow-y-auto px-6 py-6 sm:max-w-md mx-auto">
        <SheetHeader className="text-left space-y-1 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-2">
            <UserPlus className="h-6 w-6" />
          </div>
          <SheetTitle className="text-xl font-bold tracking-tight">{t("inviteTitle")}</SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">{t("inviteSubtitle")}</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-sm font-medium text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Phone Input */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t("phoneLabel")}</Label>
            <div className="relative flex items-center">
              <div className="absolute left-3 flex items-center gap-1.5 border-r pr-2.5 text-sm font-semibold text-muted-foreground">
                <span className="text-xs">🇮🇳</span>
                <span>+91</span>
              </div>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={10}
                placeholder="98765 43210"
                value={phone}
                onChange={handlePhoneChange}
                className="h-12 w-full rounded-xl border border-input bg-background pl-20 pr-4 text-base font-semibold tracking-wider text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Role Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">{t("roleLabel")}</Label>
            {isLoadingRoles ? (
              <div className="flex items-center justify-center py-6 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <RadioGroup value={roleId} onValueChange={setRoleId} className="space-y-2">
                {assignableRoles.map((role) => (
                  <label
                    key={role.id}
                    className={`flex items-start gap-3 rounded-2xl border p-4 cursor-pointer transition-colors ${
                      roleId === role.id ? "border-primary bg-primary/5" : "border-border hover:bg-neutral-50 dark:hover:bg-neutral-900"
                    }`}
                  >
                    <RadioGroupItem value={role.id} id={role.id} className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-foreground">{role.name}</span>
                        {role.is_system && (
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                            {t("systemBadge")}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {role.name === "Manager"
                          ? t("roleManagerDesc")
                          : role.name === "Front Desk"
                          ? t("roleFrontDeskDesc")
                          : role.name === "Engineer"
                          ? t("roleEngineerDesc")
                          : t("roleCustomDesc")}
                      </p>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            )}
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={createInviteMutation.isPending || phone.length !== 10 || !roleId}
            className="w-full h-12 rounded-xl text-base font-semibold"
          >
            {createInviteMutation.isPending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                {tCommon("submitting")}
              </>
            ) : (
              t("sendInviteCta")
            )}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
