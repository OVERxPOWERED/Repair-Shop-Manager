"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Receipt,
  QrCode,
  Loader2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePermission } from "@/lib/auth/store";
import { ApiError } from "@/lib/api/client";
import { isValidUpiId } from "@/lib/validation/upi";
import { UpiTestQrModal } from "@/features/billing/UpiTestQrModal";
import {
  useShopSettings,
  useUpdateShopSettings,
} from "@/features/settings/api";

export default function BillingSettingsPage() {
  const router = useRouter();
  const t = useTranslations("settings");
  const tBilling = useTranslations("billing");
  const canEdit = usePermission("shop.settings");

  const { data: shop, isLoading, error, refetch } = useShopSettings();
  const updateMutation = useUpdateShopSettings();

  const [testQrOpen, setTestQrOpen] = useState(false);
  const [formData, setFormData] = useState({
    gst_enabled: false,
    gstin: "",
    registration_type: "regular",
    invoice_prefix: "INV",
    round_off_enabled: true,
    default_terms: "",
    upi_id: "",
  });

  const [conflictError, setConflictError] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (shop) {
      setFormData({
        gst_enabled: Boolean(shop.gst_enabled),
        gstin: shop.gstin || "",
        registration_type: shop.registration_type || "regular",
        invoice_prefix: shop.invoice_prefix || "INV",
        round_off_enabled: shop.round_off_enabled ?? true,
        default_terms: shop.default_terms || "",
        upi_id: shop.upi_id || "",
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
    if (formData.gst_enabled) {
      const g = formData.gstin.trim().toUpperCase();
      if (!g) {
        errs.gstin = "GSTIN is required when GST is enabled.";
      } else if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(g)) {
        errs.gstin = "Invalid 15-digit GSTIN format.";
      }
    }
    if (!formData.invoice_prefix.trim()) {
      errs.invoice_prefix = "Invoice prefix is required.";
    } else if (formData.invoice_prefix.trim().length > 8) {
      errs.invoice_prefix = "Max 8 characters.";
    }

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    try {
      await updateMutation.mutateAsync({
        data: {
          gst_enabled: formData.gst_enabled,
          gstin: formData.gst_enabled ? formData.gstin.trim().toUpperCase() : null,
          registration_type: formData.registration_type,
          invoice_prefix: formData.invoice_prefix.trim().toUpperCase(),
          round_off_enabled: formData.round_off_enabled,
          default_terms: formData.default_terms.trim(),
          upi_id: formData.upi_id.trim() || null,
        },
        version: shop.version,
      });
      toast.success("Billing settings updated successfully!");
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
        toast.error("Failed to update billing settings.");
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
          <h2 className="text-base font-bold text-neutral-900">Failed to load billing settings</h2>
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
              <h1 className="text-base font-bold text-neutral-900">Billing & GST</h1>
              <p className="text-xs text-neutral-500">Invoices, tax registration, terms & UPI</p>
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
          {/* GST Configuration */}
          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-neutral-900">GST Registration</h2>
                <p className="text-xs text-neutral-500">Enable if your shop has an active GSTIN</p>
              </div>
              <Switch
                checked={formData.gst_enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, gst_enabled: checked })}
                disabled={!canEdit || updateMutation.isPending}
              />
            </div>

            {formData.gst_enabled && (
              <div className="space-y-4 pt-1">
                {/* GSTIN */}
                <div className="space-y-1.5">
                  <Label htmlFor="gstin" className="text-xs font-semibold text-neutral-700">
                    GSTIN Number <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="gstin"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                    disabled={!canEdit || updateMutation.isPending}
                    placeholder="e.g. 27AAAAA0000A1Z5"
                    maxLength={15}
                    className="h-11 rounded-xl uppercase font-mono text-sm"
                  />
                  {fieldErrors.gstin && (
                    <p className="text-xs text-rose-500 font-medium">{fieldErrors.gstin}</p>
                  )}
                  {formData.gstin.trim().length === 15 && (
                    <div className="pt-1">
                      <a
                        href="https://services.gst.gov.in/services/searchtp"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>{tBilling("gstVerification.verifyButton")}</span>
                      </a>
                    </div>
                  )}
                </div>

                {/* Registration Type */}
                <div className="space-y-1.5">
                  <Label htmlFor="reg_type" className="text-xs font-semibold text-neutral-700">
                    GST Scheme Type
                  </Label>
                  <Select
                    value={formData.registration_type}
                    onValueChange={(val) => setFormData({ ...formData, registration_type: val })}
                    disabled={!canEdit || updateMutation.isPending}
                  >
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue placeholder="Select scheme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="regular">Regular Scheme (Tax Invoices)</SelectItem>
                      <SelectItem value="composition">Composition Scheme (Bill of Supply)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* Invoice Prefixes & Rounding */}
          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-bold text-neutral-900 border-b border-neutral-100 pb-3">
              Invoice Settings
            </h2>

            {/* Invoice Prefix */}
            <div className="space-y-1.5">
              <Label htmlFor="invoice_prefix" className="text-xs font-semibold text-neutral-700">
                Invoice Number Prefix <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="invoice_prefix"
                value={formData.invoice_prefix}
                onChange={(e) => setFormData({ ...formData, invoice_prefix: e.target.value.toUpperCase() })}
                disabled={!canEdit || updateMutation.isPending}
                placeholder="e.g. INV or FIX"
                maxLength={8}
                className="h-11 rounded-xl uppercase font-mono text-sm"
              />
              <p className="text-[11px] text-neutral-400">
                Invoices will be numbered like {formData.invoice_prefix || "INV"}-2627-0001
              </p>
              {fieldErrors.invoice_prefix && (
                <p className="text-xs text-rose-500 font-medium">{fieldErrors.invoice_prefix}</p>
              )}
            </div>

            {/* Round-off switch */}
            <div className="flex items-center justify-between pt-2">
              <div className="space-y-0.5">
                <Label className="text-xs font-semibold text-neutral-800">
                  Round Off Cash Invoices
                </Label>
                <p className="text-[11px] text-neutral-400">
                  Rounds net total to the nearest whole rupee for cash settlements
                </p>
              </div>
              <Switch
                checked={formData.round_off_enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, round_off_enabled: checked })}
                disabled={!canEdit || updateMutation.isPending}
              />
            </div>
          </div>

          {/* Digital Payments & UPI */}
          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
              <QrCode className="w-4 h-4 text-neutral-600" />
              <h2 className="text-sm font-bold text-neutral-900">UPI Payments</h2>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="upi_id" className="text-xs font-semibold text-neutral-700">
                Shop UPI VPA ID
              </Label>
              <div className="relative">
                <Input
                  id="upi_id"
                  value={formData.upi_id}
                  onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })}
                  disabled={!canEdit || updateMutation.isPending}
                  placeholder="e.g. mobilehub@okaxis or shopname@upi"
                  className={formData.upi_id && isValidUpiId(formData.upi_id) ? "h-11 rounded-xl pr-32" : "h-11 rounded-xl"}
                />
                {Boolean(formData.upi_id && isValidUpiId(formData.upi_id)) && (
                  <button
                    type="button"
                    onClick={() => setTestQrOpen(true)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <QrCode className="h-3.5 w-3.5" />
                    <span>{tBilling("testUpiQr.button")}</span>
                  </button>
                )}
              </div>
              <p className="text-[11px] text-neutral-400">
                Used to generate BharatPe/UPI dynamic QR codes on thermal and PDF bills.
              </p>
              {fieldErrors.upi_id && (
                <p className="text-xs text-rose-500 font-medium">{fieldErrors.upi_id}</p>
              )}
            </div>
          </div>

          {/* Default Terms & Conditions */}
          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
              <Receipt className="w-4 h-4 text-neutral-600" />
              <h2 className="text-sm font-bold text-neutral-900">Invoice Terms & Conditions</h2>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="terms" className="text-xs font-semibold text-neutral-700">
                Default Terms (printed at the bottom of bills)
              </Label>
              <Textarea
                id="terms"
                value={formData.default_terms}
                onChange={(e) => setFormData({ ...formData, default_terms: e.target.value })}
                disabled={!canEdit || updateMutation.isPending}
                rows={4}
                placeholder="1. Goods once sold will not be taken back.&#10;2. Warranty covers manufacturing defects only.&#10;3. Physical / water damage voids warranty."
                className="rounded-xl text-xs leading-relaxed"
              />
            </div>
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

      <UpiTestQrModal
        open={testQrOpen}
        onOpenChange={setTestQrOpen}
        shopName={shop?.name || ""}
        upiId={formData.upi_id}
      />
    </div>
  );
}
