"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Store,
  Upload,
  Loader2,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePermission } from "@/lib/auth/store";
import { ApiError } from "@/lib/api/client";
import { GST_STATES } from "@/lib/constants/gst-states";
import {
  useShopSettings,
  useUpdateShopSettings,
  useUploadShopLogo,
  type ShopSettings,
} from "@/features/settings/api";

const SHOP_TYPES = [
  { value: "mobile", label: "Mobile Repair" },
  { value: "computer", label: "Computer / Laptop / IT" },
  { value: "appliance", label: "Home Appliances" },
  { value: "multi", label: "Multi-Service / Electronics" },
];

export default function ShopProfilePage() {
  const router = useRouter();
  const t = useTranslations("settings");
  const canEdit = usePermission("shop.settings");

  const { data: shop, isLoading, error, refetch } = useShopSettings();
  const updateMutation = useUpdateShopSettings();
  const uploadLogoMutation = useUploadShopLogo();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: "",
    shop_type: "mobile",
    phone: "",
    address_line1: "",
    address_line2: "",
    city: "",
    pincode: "",
    state_code: "",
  });

  const [conflictError, setConflictError] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (shop) {
      setFormData({
        name: shop.name || "",
        shop_type: shop.shop_type || "mobile",
        phone: shop.phone || "",
        address_line1: shop.address_line1 || "",
        address_line2: shop.address_line2 || "",
        city: shop.city || "",
        pincode: shop.pincode || "",
        state_code: shop.state_code || "",
      });
      setConflictError(false);
    }
  }, [shop]);

  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (PNG or JPEG).");
      return;
    }

    try {
      await uploadLogoMutation.mutateAsync(file);
      toast.success("Shop logo updated successfully!");
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "Failed to upload logo.";
      toast.error(msg);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop || !canEdit) return;

    setFieldErrors({});
    setConflictError(false);

    // Validation
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) {
      errs.name = "Shop name is required.";
    }
    if (formData.phone && !/^\d{10}$/.test(formData.phone.replace(/\D/g, ""))) {
      errs.phone = "Enter a valid 10-digit phone number.";
    }
    if (formData.pincode && !/^\d{6}$/.test(formData.pincode.trim())) {
      errs.pincode = "Enter a valid 6-digit pincode.";
    }

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    try {
      await updateMutation.mutateAsync({
        data: {
          name: formData.name.trim(),
          shop_type: formData.shop_type,
          phone: formData.phone.trim(),
          address_line1: formData.address_line1.trim(),
          address_line2: formData.address_line2.trim(),
          city: formData.city.trim(),
          pincode: formData.pincode.trim(),
          state_code: formData.state_code,
        },
        version: shop.version,
      });
      toast.success("Shop profile updated successfully!");
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
        toast.error("Please fix the validation errors.");
      } else {
        toast.error("Failed to update profile. Please try again.");
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
          <h2 className="text-base font-bold text-neutral-900">Failed to load shop profile</h2>
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
              <h1 className="text-base font-bold text-neutral-900">Shop Profile</h1>
              <p className="text-xs text-neutral-500">Contact details, address and branding</p>
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

        {/* Logo Section */}
        <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-neutral-900">Shop Logo</h2>
              <p className="text-xs text-neutral-500">Appears on thermal and A4 PDF invoices</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20 rounded-2xl border border-neutral-200 bg-neutral-50 flex items-center justify-center overflow-hidden shrink-0">
              {shop.logo_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={shop.logo_url}
                  alt={shop.name}
                  className="w-full h-full object-contain p-1"
                />
              ) : (
                <Store className="w-8 h-8 text-neutral-400" />
              )}
            </div>

            <div className="space-y-1.5 flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleLogoSelect}
                disabled={!canEdit || uploadLogoMutation.isPending}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canEdit || uploadLogoMutation.isPending}
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl text-xs font-semibold"
              >
                {uploadLogoMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    {shop.logo_url ? "Change Logo" : "Upload Logo"}
                  </>
                )}
              </Button>
              <p className="text-[11px] text-neutral-400 leading-tight">
                Recommended: Square PNG (transparent) or JPG, max 512×512 px.
              </p>
            </div>
          </div>
        </div>

        {/* Shop Details Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-bold text-neutral-900 border-b border-neutral-100 pb-3">
              Shop Information
            </h2>

            {/* Shop Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-semibold text-neutral-700">
                Shop Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={!canEdit || updateMutation.isPending}
                placeholder="e.g. Star Mobile Care"
                className="h-11 rounded-xl"
              />
              {fieldErrors.name && (
                <p className="text-xs text-rose-500 font-medium">{fieldErrors.name}</p>
              )}
            </div>

            {/* Shop Type */}
            <div className="space-y-1.5">
              <Label htmlFor="shop_type" className="text-xs font-semibold text-neutral-700">
                Business Type
              </Label>
              <Select
                value={formData.shop_type}
                onValueChange={(val) => setFormData({ ...formData, shop_type: val })}
                disabled={!canEdit || updateMutation.isPending}
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {SHOP_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs font-semibold text-neutral-700">
                Primary Phone Number
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={!canEdit || updateMutation.isPending}
                placeholder="10-digit mobile number"
                className="h-11 rounded-xl"
              />
              {fieldErrors.phone && (
                <p className="text-xs text-rose-500 font-medium">{fieldErrors.phone}</p>
              )}
            </div>
          </div>

          {/* Address Section */}
          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-bold text-neutral-900 border-b border-neutral-100 pb-3">
              Shop Address
            </h2>

            {/* Address Line 1 */}
            <div className="space-y-1.5">
              <Label htmlFor="addr1" className="text-xs font-semibold text-neutral-700">
                Address Line 1
              </Label>
              <Input
                id="addr1"
                value={formData.address_line1}
                onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                disabled={!canEdit || updateMutation.isPending}
                placeholder="Shop No, Building, Street"
                className="h-11 rounded-xl"
              />
            </div>

            {/* Address Line 2 */}
            <div className="space-y-1.5">
              <Label htmlFor="addr2" className="text-xs font-semibold text-neutral-700">
                Address Line 2 (Optional)
              </Label>
              <Input
                id="addr2"
                value={formData.address_line2}
                onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                disabled={!canEdit || updateMutation.isPending}
                placeholder="Area, Landmark"
                className="h-11 rounded-xl"
              />
            </div>

            {/* City & Pincode Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="city" className="text-xs font-semibold text-neutral-700">
                  City
                </Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  disabled={!canEdit || updateMutation.isPending}
                  placeholder="e.g. Mumbai"
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pincode" className="text-xs font-semibold text-neutral-700">
                  Pincode
                </Label>
                <Input
                  id="pincode"
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  disabled={!canEdit || updateMutation.isPending}
                  placeholder="6 digits"
                  maxLength={6}
                  className="h-11 rounded-xl"
                />
                {fieldErrors.pincode && (
                  <p className="text-xs text-rose-500 font-medium">{fieldErrors.pincode}</p>
                )}
              </div>
            </div>

            {/* State */}
            <div className="space-y-1.5">
              <Label htmlFor="state_code" className="text-xs font-semibold text-neutral-700">
                State / UT
              </Label>
              <Select
                value={formData.state_code}
                onValueChange={(val) => setFormData({ ...formData, state_code: val })}
                disabled={!canEdit || updateMutation.isPending}
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {GST_STATES.map((st) => (
                    <SelectItem key={st.code} value={st.code}>
                      {st.name} ({st.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
    </div>
  );
}
