"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Users, Check, X, Loader2, Shield } from "lucide-react";
import { usePermission } from "@/lib/auth/store";
import {
  usePendingJoinRequests,
  useRolesList,
  useApproveJoinRequest,
  useRejectJoinRequest,
  type JoinRequestItem,
} from "./api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { getPref, setPref } from "@/native/preferences";
import { toast } from "sonner";
import { errorMessage } from "@/i18n/errorMessage";

const DISMISS_KEY = "fixpro.dismiss_join_modal";

export function JoinRequestsModal() {
  const t = useTranslations("staff");
  const tCommon = useTranslations("common");
  const canManage = usePermission("staff.manage");

  const { data: requests = [], isLoading } = usePendingJoinRequests();
  const { data: roles = [] } = useRolesList();
  const assignableRoles = roles.filter((r) => r.name.toLowerCase() !== "owner");

  const approveMutation = useApproveJoinRequest();
  const rejectMutation = useRejectJoinRequest();

  const [open, setOpen] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({});
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (!canManage || isLoading || requests.length === 0) return;

    // Check if dismissed previously
    getPref(DISMISS_KEY).then((val) => {
      if (val !== "true") {
        setOpen(true);
      }
    });
  }, [canManage, isLoading, requests.length]);

  // Set default selected role to "Engineer" or first available
  useEffect(() => {
    if (assignableRoles.length > 0 && requests.length > 0) {
      const defaultRole = assignableRoles.find((r) => r.name === "Engineer") || assignableRoles[0];
      setSelectedRoles((prev) => {
        const next = { ...prev };
        requests.forEach((req) => {
          if (!next[req.id]) {
            next[req.id] = defaultRole.id;
          }
        });
        return next;
      });
    }
  }, [assignableRoles, requests]);

  const handleOpenChange = async (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen && dontShowAgain) {
      await setPref(DISMISS_KEY, "true");
    }
  };

  const handleApprove = async (req: JoinRequestItem) => {
    const roleId = selectedRoles[req.id];
    if (!roleId) {
      toast.error(t("selectRoleError"));
      return;
    }
    const roleObj = assignableRoles.find((r) => r.id === roleId);

    try {
      setProcessingId(req.id);
      await approveMutation.mutateAsync({ requestId: req.id, roleId });
      toast.success(
        t("requestApprovedSuccess", {
          name: req.user_name,
          role: roleObj?.name || "Staff",
        })
      );
      if (requests.length <= 1) {
        setOpen(false);
      }
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (req: JoinRequestItem) => {
    try {
      setProcessingId(req.id);
      await rejectMutation.mutateAsync(req.id);
      toast.success(t("requestRejectedSuccess"));
      if (requests.length <= 1) {
        setOpen(false);
      }
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setProcessingId(null);
    }
  };

  if (!canManage || requests.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md rounded-3xl p-6">
        <DialogHeader>
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-2">
            <Users className="w-6 h-6" />
          </div>
          <DialogTitle className="text-lg font-bold">
            {t("modalApproveTitle")}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {t("modalApproveDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 max-h-[50vh] overflow-y-auto py-2">
          {requests.map((req) => {
            const isProcessing = processingId === req.id;
            return (
              <div
                key={req.id}
                className="p-4 rounded-2xl border border-border bg-card space-y-3"
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
                  <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-2 py-0.5 rounded-full">
                    {t("codeActive")}
                  </span>
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
                    onClick={() => handleApprove(req)}
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
                    onClick={() => handleReject(req)}
                    className="h-9 px-2 rounded-xl text-neutral-500 hover:text-red-600 shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-2 border-t border-border flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="dont-show-launch"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(Boolean(checked))}
            />
            <label
              htmlFor="dont-show-launch"
              className="text-[11px] font-medium text-muted-foreground leading-none cursor-pointer"
            >
              {t("doNotShowAgain")}
            </label>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenChange(false)}
            className="text-xs font-semibold rounded-xl h-8"
          >
            {tCommon("close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
