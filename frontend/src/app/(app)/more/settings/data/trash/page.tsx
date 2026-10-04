"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Trash2,
  RotateCcw,
  Search,
  AlertTriangle,
  Loader2,
  Smartphone,
  User,
  AlertCircle,
  Calendar,
} from "lucide-react";
import { api, apiList, ApiError } from "@/lib/api/client";
import { useCurrentShop } from "@/lib/auth/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

type DeletedJob = {
  id: string;
  job_no: number;
  status: string;
  priority: string;
  fault_description: string;
  deleted_at: string;
  customer?: {
    id: string;
    name: string;
    phone?: string;
  };
  device?: {
    brand: string;
    model: string;
  };
};

type DeletedCustomer = {
  id: string;
  name: string;
  phone?: string;
  alt_phone?: string;
  created_at: string;
  deleted_at: string;
};

export default function TrashPage() {
  const t = useTranslations("trash");
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentShop = useCurrentShop();

  const [activeTab, setActiveTab] = useState<"jobs" | "customers">("jobs");
  const [search, setSearch] = useState("");

  // Confirmation dialog state for permanent delete
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    type: "jobs" | "customers";
    label: string;
  } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const permissions = currentShop?.permissions || [];
  const canDeletePermanentJob = permissions.includes("jobs.delete_permanent");
  const canDeletePermanentCustomer = permissions.includes("data.bulk_delete");

  // Fetch deleted jobs
  const {
    data: jobsData,
    isLoading: jobsLoading,
    error: jobsError,
    refetch: refetchJobs,
  } = useQuery({
    queryKey: ["trash", "jobs"],
    queryFn: () => apiList<DeletedJob>("/jobs/?deleted=true"),
    enabled: activeTab === "jobs",
  });

  // Fetch deleted customers
  const {
    data: customersData,
    isLoading: customersLoading,
    error: customersError,
    refetch: refetchCustomers,
  } = useQuery({
    queryKey: ["trash", "customers"],
    queryFn: () => apiList<DeletedCustomer>("/customers/?deleted=true"),
    enabled: activeTab === "customers",
  });

  // Restore mutation
  const restoreMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: "jobs" | "customers" }) => {
      setRestoreError(null);
      return api(`/${type}/${id}/restore/`, { method: "POST" });
    },
    onSuccess: (_, { type }) => {
      queryClient.invalidateQueries({ queryKey: ["trash", type] });
      queryClient.invalidateQueries({ queryKey: [type] });
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) {
        if (err.code === "customer.phone_exists") {
          setRestoreError(t("phoneConflict"));
          return;
        }
        setRestoreError(err.message);
      } else {
        setRestoreError("Failed to restore item");
      }
    },
  });

  // Permanent delete mutation
  const permanentDeleteMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: "jobs" | "customers" }) => {
      setDeleteError(null);
      return api(`/${type}/${id}/permanent/`, { method: "DELETE" });
    },
    onSuccess: (_, { type }) => {
      queryClient.invalidateQueries({ queryKey: ["trash", type] });
      setDeleteTarget(null);
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) {
        if (err.code === "trash.has_financial_records") {
          setDeleteError(t("financialConflict"));
          return;
        }
        setDeleteError(err.message);
      } else {
        setDeleteError("Failed to permanently delete");
      }
    },
  });

  const jobs = (jobsData?.items || []).filter((j) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      j.job_no.toString().includes(q) ||
      (j.customer?.name || "").toLowerCase().includes(q) ||
      (j.customer?.phone || "").toLowerCase().includes(q) ||
      (j.device?.brand || "").toLowerCase().includes(q) ||
      (j.device?.model || "").toLowerCase().includes(q)
    );
  });

  const customers = (customersData?.items || []).filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.phone || "").toLowerCase().includes(q);
  });

  const formatDate = (iso: string) => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="flex-1 px-4 py-4 space-y-4 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-9 h-9 rounded-xl bg-white border border-neutral-200/80 flex items-center justify-center text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100 transition-colors shrink-0 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-neutral-950 flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-rose-500" />
            <span>{t("title")}</span>
          </h1>
          <p className="text-xs text-neutral-500">{t("subtitle")}</p>
        </div>
      </div>

      {restoreError && (
        <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <span>{restoreError}</span>
          <button
            type="button"
            onClick={() => setRestoreError(null)}
            className="text-rose-500 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex rounded-xl bg-neutral-100 p-1 border border-neutral-200/80">
        <button
          type="button"
          onClick={() => {
            setActiveTab("jobs");
            setSearch("");
          }}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === "jobs"
              ? "bg-white text-neutral-900 shadow-sm"
              : "text-neutral-500 hover:text-neutral-900"
          }`}
        >
          {t("tabJobs")}
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab("customers");
            setSearch("");
          }}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === "customers"
              ? "bg-white text-neutral-900 shadow-sm"
              : "text-neutral-500 hover:text-neutral-900"
          }`}
        >
          {t("tabCustomers")}
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search deleted items..."
          className="pl-9 h-10 rounded-xl bg-white text-xs border-neutral-200"
        />
      </div>

      {/* Content */}
      {activeTab === "jobs" ? (
        jobsLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-neutral-400">
            <Loader2 className="w-6 h-6 animate-spin mb-2" />
            <span className="text-xs">Loading deleted jobs…</span>
          </div>
        ) : jobsError ? (
          <div className="py-8 text-center text-neutral-500 text-xs flex flex-col items-center">
            <AlertCircle className="w-6 h-6 text-rose-500 mb-2" />
            <span>Failed to load deleted jobs</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchJobs()}
              className="mt-3 text-xs"
            >
              Retry
            </Button>
          </div>
        ) : jobs.length === 0 ? (
          <div className="py-12 text-center text-neutral-400">
            <Trash2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-semibold text-neutral-700">{t("emptyTitle")}</p>
            <p className="text-xs text-neutral-400 mt-1">{t("emptyDesc")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="p-3.5 bg-white rounded-2xl border border-neutral-200/90 shadow-sm space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-neutral-900">
                      Job #{job.job_no}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-semibold">
                      {job.status}
                    </Badge>
                  </div>
                  {job.deleted_at && (
                    <span className="text-[11px] text-neutral-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(job.deleted_at)}
                    </span>
                  )}
                </div>

                <div className="text-xs text-neutral-600 space-y-0.5">
                  {job.customer && (
                    <div className="flex items-center gap-1.5 font-medium text-neutral-800">
                      <User className="w-3.5 h-3.5 text-neutral-400" />
                      <span>{job.customer.name}</span>
                      {job.customer.phone && (
                        <span className="text-neutral-400">({job.customer.phone})</span>
                      )}
                    </div>
                  )}
                  {job.device && (
                    <div className="flex items-center gap-1.5 text-neutral-500">
                      <Smartphone className="w-3.5 h-3.5 text-neutral-400" />
                      <span>
                        {job.device.brand} {job.device.model}
                      </span>
                    </div>
                  )}
                  {job.fault_description && (
                    <p className="text-neutral-500 line-clamp-1 italic">
                      &ldquo;{job.fault_description}&rdquo;
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-1 border-t border-neutral-100">
                  {canDeletePermanentJob && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setDeleteTarget({
                          id: job.id,
                          type: "jobs",
                          label: `Job #${job.job_no}`,
                        })
                      }
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs h-8 px-2.5"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      {t("deleteForever")}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={restoreMutation.isPending}
                    onClick={() => restoreMutation.mutate({ id: job.id, type: "jobs" })}
                    className="text-neutral-800 text-xs h-8 px-3"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1" />
                    {restoreMutation.isPending ? t("restoring") : t("restore")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : customersLoading ? (
        <div className="py-12 flex flex-col items-center justify-center text-neutral-400">
          <Loader2 className="w-6 h-6 animate-spin mb-2" />
          <span className="text-xs">Loading deleted customers…</span>
        </div>
      ) : customersError ? (
        <div className="py-8 text-center text-neutral-500 text-xs flex flex-col items-center">
          <AlertCircle className="w-6 h-6 text-rose-500 mb-2" />
          <span>Failed to load deleted customers</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchCustomers()}
            className="mt-3 text-xs"
          >
            Retry
          </Button>
        </div>
      ) : customers.length === 0 ? (
        <div className="py-12 text-center text-neutral-400">
          <Trash2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm font-semibold text-neutral-700">{t("emptyTitle")}</p>
          <p className="text-xs text-neutral-400 mt-1">{t("emptyDesc")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {customers.map((cust) => (
            <div
              key={cust.id}
              className="p-3.5 bg-white rounded-2xl border border-neutral-200/90 shadow-sm space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-neutral-900">{cust.name}</span>
                </div>
                {cust.deleted_at && (
                  <span className="text-[11px] text-neutral-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(cust.deleted_at)}
                  </span>
                )}
              </div>

              <div className="text-xs text-neutral-600">
                <p>{cust.phone || "No phone number"}</p>
                {cust.alt_phone && (
                  <p className="text-neutral-400">Alt: {cust.alt_phone}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-1 border-t border-neutral-100">
                {canDeletePermanentCustomer && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setDeleteTarget({
                        id: cust.id,
                        type: "customers",
                        label: cust.name,
                      })
                    }
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs h-8 px-2.5"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    {t("deleteForever")}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={restoreMutation.isPending}
                  onClick={() =>
                    restoreMutation.mutate({ id: cust.id, type: "customers" })
                  }
                  className="text-neutral-800 text-xs h-8 px-3"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  {restoreMutation.isPending ? t("restoring") : t("restore")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Dialog for Permanent Delete */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-sm rounded-3xl p-6">
          <DialogHeader>
            <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-2">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-base font-bold text-neutral-950">
              {t("deleteConfirmTitle")}
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              {t("deleteConfirmDesc")} ({deleteTarget?.label})
            </DialogDescription>
          </DialogHeader>

          {deleteError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              {deleteError}
            </div>
          )}

          <DialogFooter className="flex-row gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDeleteTarget(null);
                setDeleteError(null);
              }}
              className="flex-1 text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={permanentDeleteMutation.isPending}
              onClick={() => {
                if (deleteTarget) {
                  permanentDeleteMutation.mutate({
                    id: deleteTarget.id,
                    type: deleteTarget.type,
                  });
                }
              }}
              className="flex-1 text-xs"
            >
              {permanentDeleteMutation.isPending ? t("deletingForever") : t("deleteForever")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
