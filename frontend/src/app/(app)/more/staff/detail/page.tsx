"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { usePermission } from "@/lib/auth/store";
import { useLocaleStore } from "@/i18n/store";
import {
  useStaffMember,
  useRolesList,
  useChangeRole,
  useSetMemberStatus,
  type StaffMember,
} from "@/features/staff/api";
import { formatDate } from "@/lib/format/date";
import { formatPhone } from "@/lib/format/phone";
import { errorMessage } from "@/i18n/errorMessage";
import { PermissionDenied, CardSkeleton } from "@/components/states";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Shield,
  ShieldAlert,
  UserCheck,
  UserX,
  Trash2,
  Calendar,
  Phone,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

function getInitials(name: string): string {
  if (!name) return "ST";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function StaffDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const memberId = searchParams.get("id");

  const t = useTranslations("staff");
  const tCommon = useTranslations("common");

  const canView = usePermission("staff.view");
  const canManage = usePermission("staff.manage");
  const { locale } = useLocaleStore();

  const { data: member, isLoading, error: fetchError } = useStaffMember(memberId);
  const { data: roles = [] } = useRolesList();
  const assignableRoles = roles.filter((r) => r.name !== "Owner");

  const changeRoleMutation = useChangeRole();
  const setStatusMutation = useSetMemberStatus();

  // Dialog States
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!canView) {
    return <PermissionDenied />;
  }

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        <CardSkeleton />
      </div>
    );
  }

  if (fetchError || !member) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center space-y-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mx-auto">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="text-base font-bold text-foreground">{t("memberNotFoundTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("memberNotFoundBody")}</p>
        <Button variant="outline" onClick={() => router.back()} className="rounded-xl">
          {tCommon("back")}
        </Button>
      </div>
    );
  }

  const isOwner = member.role_name === "Owner";
  const isSuspended = member.status === "suspended";

  const handleOpenRoleDialog = () => {
    setSelectedRoleId(member.role_id);
    setActionError(null);
    setRoleDialogOpen(true);
  };

  const handleChangeRoleSubmit = async () => {
    if (!selectedRoleId || selectedRoleId === member.role_id) {
      setRoleDialogOpen(false);
      return;
    }
    try {
      setActionError(null);
      await changeRoleMutation.mutateAsync({
        memberId: member.id,
        roleId: selectedRoleId,
      });
      toast.success(t("roleUpdatedSuccess"));
      setRoleDialogOpen(false);
    } catch (err) {
      setActionError(errorMessage(err));
    }
  };

  const handleToggleSuspend = async () => {
    const nextAction = isSuspended ? "reactivate" : "suspend";
    try {
      setActionError(null);
      await setStatusMutation.mutateAsync({
        memberId: member.id,
        action: nextAction,
      });
      toast.success(isSuspended ? t("reactivatedSuccess") : t("suspendedSuccess"));
    } catch (err) {
      const msg = errorMessage(err);
      setActionError(msg);
      toast.error(msg);
    }
  };

  const handleRemoveSubmit = async () => {
    try {
      setActionError(null);
      await setStatusMutation.mutateAsync({
        memberId: member.id,
        action: "remove",
      });
      toast.success(t("removedSuccess"));
      setRemoveDialogOpen(false);
      router.replace("/more/staff/");
    } catch (err) {
      const msg = errorMessage(err);
      setActionError(msg);
      toast.error(msg);
      setRemoveDialogOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl h-10 w-10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold tracking-tight">{t("memberDetailTitle")}</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Error banner */}
        {actionError && (
          <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-4 text-sm font-medium text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Member Card */}
        <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xl font-bold shadow-inner">
              {getInitials(member.display_name || member.user_name)}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-foreground">
                  {member.display_name || member.user_name}
                </h2>
                {isSuspended && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive flex items-center gap-0.5">
                    <ShieldAlert className="h-3 w-3" />
                    {t("suspendedBadge")}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Shield className="h-3.5 w-3.5 text-primary" />
                <span className="font-semibold text-foreground">{member.role_name}</span>
              </div>
            </div>
          </div>

          <div className="divide-y border-t pt-4 space-y-3">
            <div className="flex items-center justify-between text-sm py-2">
              <span className="text-muted-foreground flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span>{t("phoneLabel")}</span>
              </span>
              <span className="font-semibold">{formatPhone(member.user_phone)}</span>
            </div>

            <div className="flex items-center justify-between text-sm py-2">
              <span className="text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{t("joinedDateLabel")}</span>
              </span>
              <span className="font-semibold">{formatDate(member.joined_at, locale)}</span>
            </div>
          </div>
        </div>

        {/* Management Actions */}
        {canManage && !isOwner && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
              {t("actionsHeader")}
            </h3>

            <div className="rounded-2xl border divide-y overflow-hidden bg-card shadow-sm">
              {/* Change Role Button */}
              <button
                type="button"
                onClick={handleOpenRoleDialog}
                className="w-full flex items-center justify-between p-4 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="font-semibold text-sm text-foreground">{t("changeRoleBtn")}</span>
                    <p className="text-xs text-muted-foreground">{t("changeRoleDesc")}</p>
                  </div>
                </div>
              </button>

              {/* Suspend / Reactivate Button */}
              <button
                type="button"
                onClick={handleToggleSuspend}
                disabled={setStatusMutation.isPending}
                className="w-full flex items-center justify-between p-4 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                      isSuspended ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                    }`}
                  >
                    {isSuspended ? <UserCheck className="h-5 w-5" /> : <UserX className="h-5 w-5" />}
                  </div>
                  <div>
                    <span className="font-semibold text-sm text-foreground">
                      {isSuspended ? t("reactivateStaffBtn") : t("suspendStaffBtn")}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {isSuspended ? t("reactivateStaffDesc") : t("suspendStaffDesc")}
                    </p>
                  </div>
                </div>
              </button>

              {/* Remove Button */}
              <button
                type="button"
                onClick={() => {
                  setActionError(null);
                  setRemoveDialogOpen(true);
                }}
                className="w-full flex items-center justify-between p-4 hover:bg-destructive/5 transition-colors text-left text-destructive"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                    <Trash2 className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="font-semibold text-sm">{t("removeStaffBtn")}</span>
                    <p className="text-xs text-muted-foreground">{t("removeStaffDesc")}</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Change Role Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="max-w-sm rounded-3xl p-6">
          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="text-lg font-bold">{t("changeRoleTitle")}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {t("changeRoleSubtitle")}
            </DialogDescription>
          </DialogHeader>

          {actionError && (
            <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-xs font-medium text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          <div className="py-3">
            <RadioGroup value={selectedRoleId} onValueChange={setSelectedRoleId} className="space-y-2">
              {assignableRoles.map((role) => (
                <label
                  key={role.id}
                  className={`flex items-start gap-3 rounded-2xl border p-3.5 cursor-pointer transition-colors ${
                    selectedRoleId === role.id ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <RadioGroupItem value={role.id} id={`change-${role.id}`} className="mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-foreground">{role.name}</span>
                      {role.is_system && (
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                          {t("systemBadge")}
                        </span>
                      )}
                    </div>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setRoleDialogOpen(false)}
              className="flex-1 rounded-xl h-11"
            >
              {tCommon("cancel")}
            </Button>
            <Button
              onClick={handleChangeRoleSubmit}
              disabled={changeRoleMutation.isPending || !selectedRoleId || selectedRoleId === member.role_id}
              className="flex-1 rounded-xl h-11"
            >
              {changeRoleMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                tCommon("save")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation Dialog */}
      <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <DialogContent className="max-w-sm rounded-3xl p-6">
          <DialogHeader className="text-left space-y-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-1">
              <Trash2 className="h-6 w-6" />
            </div>
            <DialogTitle className="text-lg font-bold">{t("removeDialogTitle")}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {t("removeDialogBody", { name: member.display_name || member.user_name })}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex gap-2 sm:gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setRemoveDialogOpen(false)}
              className="flex-1 rounded-xl h-11"
            >
              {tCommon("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveSubmit}
              disabled={setStatusMutation.isPending}
              className="flex-1 rounded-xl h-11"
            >
              {setStatusMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("confirmRemoveBtn")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function StaffDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-md mx-auto px-4 py-6 space-y-4">
          <CardSkeleton />
        </div>
      }
    >
      <StaffDetailContent />
    </Suspense>
  );
}
