"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Wrench,
  ShieldAlert,
  EyeOff,
  Globe,
  Loader2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { usePermission } from "@/lib/auth/store";
import { ApiError } from "@/lib/api/client";
import {
  useShopSettings,
  useUpdateShopSettings,
} from "@/features/settings/api";

export default function JobsSettingsPage() {
  const router = useRouter();
  const t = useTranslations("settings");
  const canEdit = usePermission("shop.settings");

  const { data: shop, isLoading, error, refetch } = useShopSettings();
  const updateMutation = useUpdateShopSettings();

  const [formData, setFormData] = useState({
    lock_order_after_delivery: false,
    engineers_see_assigned_only: false,
    mask_phone_for_engineers: false,
    default_warranty_days: 30,
    tracking_enabled: true,
    tracking_expiry_days: 30,
  });

  const [conflictError, setConflictError] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (shop) {
      setFormData({
        lock_order_after_delivery: Boolean(shop.lock_order_after_delivery),
        engineers_see_assigned_only: Boolean(shop.engineers_see_assigned_only),
        mask_phone_for_engineers: Boolean(shop.mask_phone_for_engineers),
        default_warranty_days: shop.default_warranty_days ?? 30,
        tracking_enabled: shop.tracking_enabled ?? true,
        tracking_expiry_days: shop.tracking_expiry_days ?? 30,
      });
      setConflictError(false);
    }
  }, [shop]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop || !canEdit) return;

    setFieldErrors({});
    setConflictError(false);

    const errs: Record<string, string> = {};
    if (formData.default_warranty_days < 0) {
      errs.default_warranty_days = "Warranty days cannot be negative.";
    }
    if (formData.tracking_expiry_days < 1) {
      errs.tracking_expiry_days = "Tracking expiry must be at least 1 day.";
    }

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    try {
      await updateMutation.mutateAsync({
        data: {
          lock_order_after_delivery: formData.lock_order_after_delivery,
          engineers_see_assigned_only: formData.engineers_see_assigned_only,
          mask_phone_for_engineers: formData.mask_phone_for_engineers,
          default_warranty_days: Number(formData.default_warranty_days),
          tracking_enabled: formData.tracking_enabled,
          tracking_expiry_days: Number(formData.tracking_expiry_days),
        },
        version: shop.version,
      });
      toast.success("Job policies updated successfully!");
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 409) {
        setConflictError(true);
        toast.error("Settings were modified by another user. Please reload.");
      } else if (err instanceof ApiError && err.fields) {
        const mapped: Record<string, string> = {};
        for (const [k, v] of Object.entries(err.fields)) {
          mapped[k] = Array.isArray(v) ? v[0] : String(v);
        }
        setFieldErrors(mapped);
        toast.error("Please fix validation errors.");
      } else {
        toast.error("Failed to update job settings.");
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-neutral-400 animate-spin" />
      </div>
    );
  }

  if (error || !shop) {
    return (
      <div className="min-h-screen bg-neutral-50 p-4 max-w-xl mx-auto">
        <div className="bg-white rounded-3xl p-6 border border-neutral-200 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <h2 className="text-base font-bold text-neutral-900">Failed to load job settings</h2>
          <Button onClick={() => refetch()} variant="outline" className="rounded-xl">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 px-4 py-3.5">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="w-9 h-9 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-600 hover:bg-neutral-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base font-bold text-neutral-900">Jobs & Workflow</h1>
              <p className="text-xs text-neutral-500">Security policies, warranty & public tracking</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-6">
        {/* Permission Notice */}
        {!canEdit && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-800 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <span>You do not have permission to modify shop settings. Changes cannot be saved.</span>
          </div>
        )}

        {/* Conflict Error Banner */}
        {conflictError && (
          <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>Another user updated these settings. Please reload to see the latest version.</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => refetch()}
              className="shrink-0 rounded-xl bg-white border-rose-300 text-rose-700 hover:bg-rose-100"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Reload
            </Button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Workflow & Delivery Security */}
          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
              <Wrench className="w-4 h-4 text-neutral-600" />
              <h2 className="text-sm font-bold text-neutral-900">Job Sheet Policies</h2>
            </div>

            {/* Lock order after delivery */}
            <div className="flex items-center justify-between py-1">
              <div className="space-y-0.5 pr-4">
                <Label className="text-xs font-semibold text-neutral-800">
                  Lock Job Sheets After Delivery
                </Label>
                <p className="text-[11px] text-neutral-400">
                  Prevents edits to job line items and costs once the device is marked Delivered
                </p>
              </div>
              <Switch
                checked={formData.lock_order_after_delivery}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, lock_order_after_delivery: checked })
                }
                disabled={!canEdit || updateMutation.isPending}
              />
            </div>

            {/* Default warranty days */}
            <div className="space-y-1.5 pt-2 border-t border-neutral-100">
              <Label htmlFor="warranty" className="text-xs font-semibold text-neutral-700">
                Default Repair Warranty (Days)
              </Label>
              <Input
                id="warranty"
                type="number"
                min={0}
                max={365}
                value={formData.default_warranty_days}
                onChange={(e) =>
                  setFormData({ ...formData, default_warranty_days: parseInt(e.target.value) || 0 })
                }
                disabled={!canEdit || updateMutation.isPending}
                className="h-11 rounded-xl w-32"
              />
              <p className="text-[11px] text-neutral-400">
                Automatically pre-fills the warranty period on new repair jobs
              </p>
              {fieldErrors.default_warranty_days && (
                <p className="text-xs text-rose-500 font-medium">
                  {fieldErrors.default_warranty_days}
                </p>
              )}
            </div>
          </div>

          {/* Technician Privacy & Access Control */}
          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
              <ShieldAlert className="w-4 h-4 text-neutral-600" />
              <h2 className="text-sm font-bold text-neutral-900">Technician Privacy & Access</h2>
            </div>

            {/* Engineers see assigned only */}
            <div className="flex items-center justify-between py-1">
              <div className="space-y-0.5 pr-4">
                <Label className="text-xs font-semibold text-neutral-800">
                  Restrict Technicians to Assigned Jobs
                </Label>
                <p className="text-[11px] text-neutral-400">
                  Technicians only see jobs assigned to them, hiding other shop repair sheets
                </p>
              </div>
              <Switch
                checked={formData.engineers_see_assigned_only}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, engineers_see_assigned_only: checked })
                }
                disabled={!canEdit || updateMutation.isPending}
              />
            </div>

            {/* Mask phone for engineers */}
            <div className="flex items-center justify-between py-1 border-t border-neutral-100 pt-3">
              <div className="space-y-0.5 pr-4">
                <Label className="text-xs font-semibold text-neutral-800">
                  Mask Customer Phone for Technicians
                </Label>
                <p className="text-[11px] text-neutral-400">
                  Hides full customer phone numbers (e.g. 98••••1234) to protect customer privacy
                </p>
              </div>
              <Switch
                checked={formData.mask_phone_for_engineers}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, mask_phone_for_engineers: checked })
                }
                disabled={!canEdit || updateMutation.isPending}
              />
            </div>
          </div>

          {/* Customer Web Tracking */}
          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
              <Globe className="w-4 h-4 text-neutral-600" />
              <h2 className="text-sm font-bold text-neutral-900">Customer Public Tracking Link</h2>
            </div>

            {/* Enable public tracking */}
            <div className="flex items-center justify-between py-1">
              <div className="space-y-0.5 pr-4">
                <Label className="text-xs font-semibold text-neutral-800">
                  Public Status Tracking Links
                </Label>
                <p className="text-[11px] text-neutral-400">
                  Allow customers to check repair progress without login via secure SMS/WhatsApp link
                </p>
              </div>
              <Switch
                checked={formData.tracking_enabled}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, tracking_enabled: checked })
                }
                disabled={!canEdit || updateMutation.isPending}
              />
            </div>

            {/* Tracking link expiry */}
            {formData.tracking_enabled && (
              <div className="space-y-1.5 pt-2 border-t border-neutral-100">
                <Label htmlFor="expiry" className="text-xs font-semibold text-neutral-700">
                  Link Expiry After Delivery (Days)
                </Label>
                <Input
                  id="expiry"
                  type="number"
                  min={1}
                  max={365}
                  value={formData.tracking_expiry_days}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tracking_expiry_days: parseInt(e.target.value) || 30,
                    })
                  }
                  disabled={!canEdit || updateMutation.isPending}
                  className="h-11 rounded-xl w-32"
                />
                <p className="text-[11px] text-neutral-400">
                  Number of days the customer tracking link remains accessible after delivery
                </p>
                {fieldErrors.tracking_expiry_days && (
                  <p className="text-xs text-rose-500 font-medium">
                    {fieldErrors.tracking_expiry_days}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Submit CTA */}
          {canEdit && (
            <div className="pt-2">
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                className="w-full h-12 rounded-xl text-sm font-bold bg-neutral-900 text-white hover:bg-neutral-800"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          )}
        </form>
      </main>
    </div>
  );
}
