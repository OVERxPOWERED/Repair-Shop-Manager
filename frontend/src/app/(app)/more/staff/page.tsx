"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { usePermission } from "@/lib/auth/store";
import {
  useStaffList,
  useInvitesList,
  useRevokeInvite,
  useShopJoinCode,
  useConfigureJoinCode,
  usePendingJoinRequests,
  useApproveJoinRequest,
  useRejectJoinRequest,
  useRolesList,
  type StaffMember,
  type InviteItem,
  type JoinRequestItem,
} from "@/features/staff/api";
import { InviteSheet } from "@/features/staff/InviteSheet";
import { PermissionDenied, ListSkeleton, EmptyState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  UserPlus,
  Users,
  Clock,
  Trash2,
  ChevronRight,
  ShieldAlert,
  KeyRound,
  Copy,
  Check,
  Share2,
  Settings2,
  X,
  Loader2,
} from "lucide-react";
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
  const [validityModalOpen, setValidityModalOpen] = useState(false);
  const [validityChoice, setValidityChoice] = useState<"24h" | "2d" | "5d" | "7d" | "never" | "custom">("7d");
  const [customDays, setCustomDays] = useState(14);
  const [codeCopied, setCodeCopied] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({});
  const [processingReqId, setProcessingReqId] = useState<string | null>(null);

  const { data: staff = [], isLoading: isLoadingStaff } = useStaffList();
  const { data: invites = [], isLoading: isLoadingInvites } = useInvitesList();
  const { data: joinCodeData } = useShopJoinCode();
  const { data: pendingRequests = [] } = usePendingJoinRequests();
  const { data: roles = [] } = useRolesList();
  const assignableRoles = roles.filter((r) => r.name.toLowerCase() !== "owner");

  const revokeInviteMutation = useRevokeInvite();
  const configureCodeMutation = useConfigureJoinCode();
  const approveMutation = useApproveJoinRequest();
  const rejectMutation = useRejectJoinRequest();

  // Set default selected role for pending requests
  useEffect(() => {
    if (assignableRoles.length > 0 && pendingRequests.length > 0) {
      const defaultRole = assignableRoles.find((r) => r.name === "Engineer") || assignableRoles[0];
      setSelectedRoles((prev) => {
        const next = { ...prev };
        pendingRequests.forEach((req) => {
          if (!next[req.id]) {
            next[req.id] = defaultRole.id;
          }
        });
        return next;
      });
    }
  }, [assignableRoles, pendingRequests]);

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

  const handleCopyCode = () => {
    if (!joinCodeData?.join_code) return;
    navigator.clipboard.writeText(joinCodeData.join_code);
    setCodeCopied(true);
    toast.success(t("codeCopied"));
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    if (!joinCodeData?.join_code) return;
    const msg = t("whatsAppShareMessage", { code: joinCodeData.join_code });
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  const handleSaveValidity = async (regenerate = false) => {
    try {
      await configureCodeMutation.mutateAsync({
        duration: validityChoice,
        custom_days: validityChoice === "custom" ? customDays : undefined,
        regenerate,
      });
      toast.success(t("masterCodeTitle") + " " + tCommon("save"));
      setValidityModalOpen(false);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const handleApproveRequest = async (req: JoinRequestItem) => {
    const roleId = selectedRoles[req.id];
    if (!roleId) {
      toast.error(t("selectRoleError"));
      return;
    }
    const roleObj = assignableRoles.find((r) => r.id === roleId);

    try {
      setProcessingReqId(req.id);
      await approveMutation.mutateAsync({ requestId: req.id, roleId });
      toast.success(
        t("requestApprovedSuccess", {
          name: req.user_name,
          role: roleObj?.name || "Staff",
        })
      );
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setProcessingReqId(null);
    }
  };

  const handleRejectRequest = async (req: JoinRequestItem) => {
    try {
      setProcessingReqId(req.id);
      await rejectMutation.mutateAsync(req.id);
      toast.success(t("requestRejectedSuccess"));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setProcessingReqId(null);
    }
  };

  const joinCode = joinCodeData?.join_code || "FX-XXXX";

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

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* 1. Master Join Code Card (for owners/managers) */}
        {canManage && (
          <section className="p-5 rounded-3xl bg-neutral-900 text-white dark:bg-neutral-950 border border-neutral-800 space-y-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-neutral-800 flex items-center justify-center text-primary">
                  <KeyRound className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                    {t("masterCodeTitle")}
                  </h2>
                  <div className="text-2xl font-mono font-black tracking-widest text-white mt-0.5">
                    {joinCode}
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                {joinCodeData?.is_expired ? t("codeExpired") : t("codeActive")}
              </span>
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed">
              {t("masterCodeDesc")}
            </p>

            <div className="pt-1 flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyCode}
                className="flex-1 h-9 rounded-xl text-xs font-bold gap-1.5 border-neutral-700 bg-neutral-800 text-white hover:bg-neutral-700"
              >
                {codeCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{t("copyCode")}</span>
              </Button>

              <Button
                size="sm"
                onClick={handleWhatsAppShare}
                className="flex-1 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 shadow-sm"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{t("shareWhatsApp")}</span>
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setValidityModalOpen(true)}
                className="h-9 w-9 rounded-xl border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700 shrink-0"
              >
                <Settings2 className="w-4 h-4" />
              </Button>
            </div>
          </section>
        )}

        {/* 2. Pending Join Requests Section */}
        {canManage && pendingRequests.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span>{t("pendingRequestsTitle")}</span>
              </h2>
              <span className="text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 px-2 py-0.5 rounded-full">
                {pendingRequests.length}
              </span>
            </div>

            <div className="space-y-2.5">
              {pendingRequests.map((req) => {
                const isProcessing = processingReqId === req.id;
                return (
                  <div
                    key={req.id}
                    className="p-4 rounded-2xl border border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/20 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-foreground">
                          {req.user_name}
                        </h3>
                        <p className="text-[11px] text-muted-foreground">
                          {req.user_email || req.user_phone || req.display_name}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Select
                        value={selectedRoles[req.id] || ""}
                        onValueChange={(val) =>
                          setSelectedRoles((prev) => ({ ...prev, [req.id]: val }))
                        }
                      >
                        <SelectTrigger className="h-9 text-xs rounded-xl flex-1 bg-background">
                          <SelectValue placeholder={t("selectRoleToAssign")} />
                        </SelectTrigger>
                        <SelectContent>
                          {assignableRoles.map((r) => (
                            <SelectItem key={r.id} value={r.id} className="text-xs">
                              {r.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button
                        size="sm"
                        disabled={isProcessing}
                        onClick={() => handleApproveRequest(req)}
                        className="h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1 shrink-0"
                      >
                        {isProcessing ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        <span>{tCommon("confirm")}</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isProcessing}
                        onClick={() => handleRejectRequest(req)}
                        className="h-9 px-2 rounded-xl text-neutral-500 hover:text-red-600 shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 3. Active Staff List */}
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

        {/* 4. Pending Invites List */}
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

      {/* Code Validity & Reset Modal */}
      <Dialog open={validityModalOpen} onOpenChange={setValidityModalOpen}>
        <DialogContent className="max-w-sm rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {t("codeValidity")}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {t("masterCodeDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                {t("codeValidity")}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: "24h", label: t("validity24h") },
                    { id: "2d", label: t("validity2d") },
                    { id: "5d", label: t("validity5d") },
                    { id: "7d", label: t("validity7d") },
                    { id: "never", label: t("validityNever") },
                    { id: "custom", label: t("validityCustom") },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setValidityChoice(opt.id)}
                    className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      validityChoice === opt.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {validityChoice === "custom" && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  {t("validityCustom")}
                </label>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={customDays}
                  onChange={(e) => setCustomDays(parseInt(e.target.value) || 1)}
                  className="h-10 text-xs rounded-xl"
                />
              </div>
            )}

            <div className="pt-2 flex flex-col gap-2">
              <Button
                onClick={() => handleSaveValidity(false)}
                disabled={configureCodeMutation.isPending}
                className="w-full h-11 rounded-xl text-xs font-bold"
              >
                {configureCodeMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  tCommon("save")
                )}
              </Button>

              <Button
                variant="outline"
                onClick={() => handleSaveValidity(true)}
                disabled={configureCodeMutation.isPending}
                className="w-full h-11 rounded-xl text-xs font-bold text-muted-foreground"
              >
                {t("generateCodeBtn")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Direct Phone Invite Sheet */}
      <InviteSheet open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  );
}
