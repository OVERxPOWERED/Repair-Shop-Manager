"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Phone, Mail, MapPin, FileText, AlertCircle, ExternalLink, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useCreateCustomer, useUpdateCustomer, useCustomerByPhone, type Customer } from "./api";
import { customerFormSchema } from "./schema";
import { ApiError } from "@/lib/api/client";

interface CustomerFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
  onSaved?: (customer: Customer) => void;
}

export function CustomerFormSheet({ open, onOpenChange, customer, onSaved }: CustomerFormSheetProps) {
  const t = useTranslations("customers");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const isEdit = Boolean(customer);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [altPhone, setAltPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [preferredLocale, setPreferredLocale] = useState("en");
  const [whatsappOptIn, setWhatsappOptIn] = useState(true);
  const [smsOptIn, setSmsOptIn] = useState(true);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [conflictError, setConflictError] = useState<boolean>(false);

  // Prepopulate form on open/change
  useEffect(() => {
    if (customer) {
      setName(customer.name);
      setPhone(customer.phone?.replace(/^\+91/, "") ?? "");
      setAltPhone(customer.alt_phone?.replace(/^\+91/, "") ?? "");
      setEmail(customer.email ?? "");
      setAddress(customer.address ?? "");
      setNotes(customer.notes ?? "");
      setPreferredLocale(customer.preferred_locale ?? "en");
      setWhatsappOptIn(customer.whatsapp_opt_in ?? true);
      setSmsOptIn(customer.sms_opt_in ?? true);
    } else {
      setName("");
      setPhone("");
      setAltPhone("");
      setEmail("");
      setAddress("");
      setNotes("");
      setPreferredLocale("en");
      setWhatsappOptIn(true);
      setSmsOptIn(true);
    }
    setFormErrors({});
    setGeneralError(null);
    setConflictError(false);
  }, [customer, open]);

  // Lookup existing customer by phone when creating
  const clean10Phone = phone.replace(/\D/g, "");
  const lookupPhone = !isEdit && clean10Phone.length === 10 ? `+91${clean10Phone}` : null;
  const { data: existingCustomer } = useCustomerByPhone(lookupPhone);

  const createCustomerMutation = useCreateCustomer();
  const updateCustomerMutation = useUpdateCustomer();

  const isSubmitting = createCustomerMutation.isPending || updateCustomerMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    setGeneralError(null);
    setConflictError(false);

    // Validate with Zod
    const result = customerFormSchema.safeParse({
      name,
      phone: phone ? (phone.startsWith("+") ? phone : `+91${phone.replace(/\D/g, "")}`) : "",
      alt_phone: altPhone ? (altPhone.startsWith("+") ? altPhone : `+91${altPhone.replace(/\D/g, "")}`) : "",
      email,
      address,
      notes,
      preferred_locale: preferredLocale as "en" | "hi" | "hi-Latn",
      whatsapp_opt_in: whatsappOptIn,
      sms_opt_in: smsOptIn,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const fieldName = issue.path[0] as string;
        if (!fieldErrors[fieldName]) {
          fieldErrors[fieldName] = issue.message;
        }
      }
      setFormErrors(fieldErrors);
      return;
    }

    try {
      if (isEdit && customer) {
        const updated = await updateCustomerMutation.mutateAsync({
          id: customer.id,
          version: customer.version,
          name: result.data.name,
          phone: result.data.phone || null,
          alt_phone: result.data.alt_phone || "",
          email: result.data.email || "",
          address: result.data.address || "",
          notes: result.data.notes || "",
          preferred_locale: result.data.preferred_locale,
          whatsapp_opt_in: result.data.whatsapp_opt_in,
          sms_opt_in: result.data.sms_opt_in,
        });
        toast.success(t("customerUpdatedSuccess"));
        onOpenChange(false);
        onSaved?.(updated);
      } else {
        const created = await createCustomerMutation.mutateAsync({
          name: result.data.name,
          phone: result.data.phone || null,
          alt_phone: result.data.alt_phone || "",
          email: result.data.email || "",
          address: result.data.address || "",
          notes: result.data.notes || "",
          preferred_locale: result.data.preferred_locale,
          whatsapp_opt_in: result.data.whatsapp_opt_in,
          sms_opt_in: result.data.sms_opt_in,
        });
        toast.success(t("customerCreatedSuccess"));
        onOpenChange(false);
        onSaved?.(created);
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setConflictError(true);
          return;
        }
        if (err.fields) {
          const srvErrors: Record<string, string> = {};
          for (const [k, v] of Object.entries(err.fields)) {
            if (k === "phone" && v.includes("customer.phone_exists")) {
              srvErrors.phone = t("phoneExistsError");
            } else {
              srvErrors[k] = v[0] || err.message;
            }
          }
          setFormErrors(srvErrors);
          return;
        }
        setGeneralError(err.message);
      } else {
        setGeneralError(tCommon("errors.generic"));
      }
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[92vh] overflow-y-auto px-6 py-6 sm:max-w-lg mx-auto">
        <SheetHeader className="text-left space-y-1 mb-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-1">
            <User className="h-5 w-5" />
          </div>
          <SheetTitle className="text-xl font-bold tracking-tight">
            {isEdit ? t("editCustomerTitle") : t("newCustomerTitle")}
          </SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            {isEdit ? t("editCustomerSubtitle") : t("newCustomerSubtitle")}
          </SheetDescription>
        </SheetHeader>

        {/* Conflict Error (409) */}
        {conflictError && (
          <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 p-3.5 text-sm text-destructive flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{t("concurrencyConflict")}</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 h-8 text-xs font-medium"
              onClick={() => onOpenChange(false)}
            >
              <RefreshCw className="h-3 w-3" />
              {t("reloadBtn")}
            </Button>
          </div>
        )}

        {/* Existing Customer Lookup warning */}
        {!isEdit && existingCustomer && (
          <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-sm text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                {t("numberBelongsTo", { name: existingCustomer.name })}
              </span>
            </div>
            <Button
              type="button"
              variant="default"
              size="sm"
              className="gap-1 h-7 text-xs px-2.5 shrink-0 bg-amber-600 hover:bg-amber-700 text-white"
              onClick={() => {
                onOpenChange(false);
                router.push(`/customers/detail/?id=${existingCustomer.id}`);
              }}
            >
              <ExternalLink className="h-3 w-3" />
              {t("openCustomerBtn")}
            </Button>
          </div>
        )}

        {generalError && (
          <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{generalError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Customer Name */}
          <div className="space-y-1.5">
            <Label htmlFor="cust-name" className="text-xs font-semibold">
              {t("nameLabel")} <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="cust-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("namePlaceholder")}
                className="pl-9 h-11 rounded-xl"
                autoComplete="off"
              />
            </div>
            {formErrors.name && <p className="text-xs text-destructive">{formErrors.name}</p>}
          </div>

          {/* Primary Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="cust-phone" className="text-xs font-semibold">
              {t("phoneLabel")}
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="cust-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t("phonePlaceholder")}
                className="pl-9 h-11 rounded-xl"
                disabled={isEdit && Boolean(customer?.phone_masked)}
              />
            </div>
            {formErrors.phone && <p className="text-xs text-destructive">{formErrors.phone}</p>}
          </div>

          {/* Alternate Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="cust-alt-phone" className="text-xs font-semibold">
              {t("altPhoneLabel")}
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="cust-alt-phone"
                type="tel"
                value={altPhone}
                onChange={(e) => setAltPhone(e.target.value)}
                placeholder={t("altPhonePlaceholder")}
                className="pl-9 h-11 rounded-xl"
                disabled={isEdit && Boolean(customer?.phone_masked)}
              />
            </div>
            {formErrors.alt_phone && <p className="text-xs text-destructive">{formErrors.alt_phone}</p>}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="cust-email" className="text-xs font-semibold">
              {t("emailLabel")}
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="cust-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("emailPlaceholder")}
                className="pl-9 h-11 rounded-xl"
              />
            </div>
            {formErrors.email && <p className="text-xs text-destructive">{formErrors.email}</p>}
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <Label htmlFor="cust-address" className="text-xs font-semibold">
              {t("addressLabel")}
            </Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="cust-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t("addressPlaceholder")}
                className="pl-9 h-11 rounded-xl"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="cust-notes" className="text-xs font-semibold">
              {t("notesLabel")}
            </Label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Textarea
                id="cust-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("notesPlaceholder")}
                className="pl-9 min-h-[60px] rounded-xl text-sm"
              />
            </div>
          </div>

          {/* Preferred Locale */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{t("languageLabel")}</Label>
            <Select value={preferredLocale} onValueChange={setPreferredLocale}>
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder={t("languageLabel")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="hi">हिंदी (Hindi)</SelectItem>
                <SelectItem value="hi-Latn">Hinglish</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notifications Opt-In Switches */}
          <div className="pt-2 pb-1 space-y-3">
            <div className="flex items-center justify-between rounded-xl border p-3">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">{t("whatsappOptIn")}</Label>
                <p className="text-xs text-muted-foreground">{t("whatsappOptInBody")}</p>
              </div>
              <Switch checked={whatsappOptIn} onCheckedChange={setWhatsappOptIn} />
            </div>

            <div className="flex items-center justify-between rounded-xl border p-3">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">{t("smsOptIn")}</Label>
                <p className="text-xs text-muted-foreground">{t("smsOptInBody")}</p>
              </div>
              <Switch checked={smsOptIn} onCheckedChange={setSmsOptIn} />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-12 rounded-xl text-sm font-medium"
              onClick={() => onOpenChange(false)}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 h-12 rounded-xl text-sm font-medium"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {tCommon("submitting")}
                </>
              ) : isEdit ? (
                t("saveCustomerBtn")
              ) : (
                t("createCustomerBtn")
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
