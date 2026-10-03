"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { usePermission } from "@/lib/auth/store";
import { useStaffList, useInvitesList, useRevokeInvite, type StaffMember, type InviteItem } from "@/features/staff/api";
import { InviteSheet } from "@/features/staff/InviteSheet";
import { PermissionDenied, ListSkeleton, EmptyState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { ArrowLeft, UserPlus, Users, Clock, Trash2, ChevronRight, Shield, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { errorMessage } from "@/i18n/errorMessage";

function maskPhone(phone: string): string {
  if (!phone) return "";
  const cleaned = phone.replace(/\s+/g, "");
  if (cleaned.length >= 10) {
    const start = cleaned.slice(0, cleaned.length - 8);
    const mid1 = cleaned.slice(cleaned.length - 8, cleaned.length - 6);
    const end = cleaned.slice(cleaned.length - 3);
    return `${start} ${mid1}*** **${end}`;
  }
  return phone;
}

function getInitials(name: string): string {
  if (!name) return "ST";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export default function StaffPage() {
  const router = useRouter();
  const t = useTranslations("staff");
  const tCommon = useTranslations("common");

  const canView = usePermission("staff.view");
  const canManage = usePermission("staff.manage");

  const [inviteOpen, setInviteOpen] = useState(false);

  const { data: staff = [], isLoading: isLoadingStaff, error: staffError } = useStaffList();
  const { data: invites = [], isLoading: isLoadingInvites } = useInvitesList();
  const revokeInviteMutation = useRevokeInvite();

  if (!canView) {
    return <PermissionDenied />;
  }

  const handleRevoke = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await revokeInviteMutation.mutateAsync(id);
      toast.success(t("inviteRevoked"));
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Top Header */}
      <div className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl h-10 w-10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold tracking-tight">{t("title")}</h1>
        </div>

        {canManage && (
          <Button
            size="sm"
            onClick={() => setInviteOpen(true)}
            className="rounded-xl h-9 px-3 gap-1.5 text-xs font-semibold"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>{t("inviteBtn")}</span>
          </Button>
        )}
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-8">
        {/* Active Staff List */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              <span>{t("teamHeader")}</span>
            </h2>
            <span className="text-xs font-semibold text-muted-foreground bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
              {staff.length}
            </span>
          </div>

          {isLoadingStaff ? (
            <ListSkeleton rows={4} />
          ) : staff.length === 0 ? (
            <EmptyState
              icon={Users}
              title={t("emptyStaffTitle")}
              body={t("emptyStaffBody")}
              action={
                canManage ? (
                  <Button onClick={() => setInviteOpen(true)} className="rounded-xl">
                    <UserPlus className="h-4 w-4 mr-1.5" />
                    {t("inviteBtn")}
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="rounded-2xl border divide-y overflow-hidden bg-card shadow-sm">
              {staff.map((member: StaffMember) => {
                const isSuspended = member.status === "suspended";
                return (
                  <Link
                    key={member.id}
                    href={`/more/staff/detail/?id=${member.id}`}
                    className="flex items-center justify-between p-4 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-sm font-bold shadow-inner">
                        {getInitials(member.display_name || member.user_name)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground">
                            {member.display_name || member.user_name}
                          </span>
                          {isSuspended && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive flex items-center gap-0.5">
                              <ShieldAlert className="h-3 w-3" />
                              {t("suspendedBadge")}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span>{maskPhone(member.user_phone)}</span>
                          <span>•</span>
                          <span className="font-medium text-foreground/80">{member.role_name}</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Pending Invites List */}
        {invites.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>{t("pendingHeader")}</span>
              </h2>
              <span className="text-xs font-semibold text-muted-foreground bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-2 py-0.5 rounded-full">
                {invites.length}
              </span>
            </div>

            {isLoadingInvites ? (
              <ListSkeleton rows={2} />
            ) : (
              <div className="rounded-2xl border divide-y overflow-hidden bg-card shadow-sm">
                {invites.map((invite: InviteItem) => (
                  <div key={invite.id} className="flex items-center justify-between p-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">{maskPhone(invite.phone)}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                          {invite.role_name}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t("invitedBy", { name: invite.invited_by_name || t("ownerTitle") })}
                      </p>
                    </div>

                    {canManage && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={revokeInviteMutation.isPending}
                        onClick={(e) => handleRevoke(invite.id, e)}
                        className="rounded-xl h-8 px-2 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {/* Invite Sheet */}
      <InviteSheet open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  );
}
