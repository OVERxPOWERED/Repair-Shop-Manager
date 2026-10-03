"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  MoreVertical,
  Phone,
  MessageCircle,
  Mail,
  MapPin,
  FileText,
  Smartphone,
  Plus,
  Edit2,
  Trash2,
  Lock,
  Clock,
  Laptop,
  Tv,
  Wrench,
  Box,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardSkeleton } from "@/components/states/CardSkeleton";
import { ErrorState } from "@/components/states/ErrorState";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { CustomerFormSheet } from "@/features/customers/CustomerFormSheet";
import { DeviceFormSheet } from "@/features/devices/DeviceFormSheet";
import { useCustomer, useDeleteCustomer } from "@/features/customers/api";
import { useDevices, type Device } from "@/features/devices/api";
import { useJobs } from "@/features/jobs/api";
import { JobCard } from "@/features/jobs/components/JobCard";
import { toast } from "sonner";

function CustomerDetailContent() {
  const t = useTranslations("customers");
  const tDevices = useTranslations("devices");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerId = searchParams.get("id");

  const { data: customer, isLoading, isError, error, refetch } = useCustomer(customerId);
  const { data: devices = [], isLoading: isLoadingDevices, refetch: refetchDevices } = useDevices(customerId);
  const { data: customerJobsData, isLoading: isLoadingJobs } = useJobs(
    customerId ? { customer: customerId } : undefined
  );
  const customerJobs = customerJobsData?.items ?? [];

  const [isEditCustomerOpen, setIsEditCustomerOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [isDeviceFormOpen, setIsDeviceFormOpen] = useState(false);

  const deleteCustomerMutation = useDeleteCustomer();

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (isError || !customer) {
    return (
      <div className="p-4">
        <ErrorState error={error} onRetry={refetch} />
      </div>
    );
  }

  const cleanPhoneDigits = customer.phone ? customer.phone.replace(/\D/g, "") : "";
  const whatsappUrl = cleanPhoneDigits ? `https://wa.me/${cleanPhoneDigits}` : null;
  const telUrl = customer.phone ? `tel:${customer.phone}` : null;

  const handleDeleteCustomer = async () => {
    try {
      await deleteCustomerMutation.mutateAsync(customer.id);
      toast.success(t("customerDeletedSuccess"));
      router.replace("/customers/");
    } catch {
      toast.error(tCommon("errors.generic"));
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "laptop":
        return Laptop;
      case "tv":
        return Tv;
      case "appliance":
        return Wrench;
      case "other":
        return Box;
      default:
        return Smartphone;
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-full pb-24">
      {/* Top Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="h-9 w-9 p-0 rounded-xl"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold truncate max-w-[200px]">{customer.name}</h1>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditCustomerOpen(true)}
            className="h-9 w-9 p-0 rounded-xl"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDeleteOpen(true)}
            className="h-9 w-9 p-0 rounded-xl text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Customer Summary Card */}
        <div className="rounded-2xl border bg-card p-4 space-y-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h2 className="text-xl font-bold tracking-tight text-foreground">{customer.name}</h2>
              {customer.notes && (
                <p className="text-xs text-muted-foreground line-clamp-2">{customer.notes}</p>
              )}
            </div>
            <div className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase">
              {customer.preferred_locale}
            </div>
          </div>

          {/* Contact Details & Quick Call/WhatsApp Buttons */}
          <div className="pt-2 border-t space-y-3">
            {customer.phone ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono text-sm font-semibold">{customer.phone}</span>
                  {customer.phone_masked && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full">
                      <Lock className="h-3 w-3" />
                      {t("maskedBadge")}
                    </span>
                  )}
                </div>

                {/* Call / WhatsApp actions only if not masked */}
                {!customer.phone_masked && (
                  <div className="flex items-center gap-2">
                    {telUrl && (
                      <a
                        href={telUrl}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        aria-label="Call customer"
                      >
                        <Phone className="h-4 w-4" />
                      </a>
                    )}
                    {whatsappUrl && (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                        aria-label="WhatsApp customer"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-muted-foreground italic">
                <Phone className="h-4 w-4" />
                <span>{t("noPhone")}</span>
              </div>
            )}

            {customer.alt_phone && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Phone className="h-3.5 w-3.5" />
                <span>Alt: {customer.alt_phone}</span>
              </div>
            )}

            {customer.email && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                <span>{customer.email}</span>
              </div>
            )}

            {customer.address && (
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>{customer.address}</span>
              </div>
            )}
          </div>
        </div>

        {/* Devices Card */}
        <div className="rounded-2xl border bg-card p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-primary" />
              <span>{tDevices("devicesTitle")}</span>
              <span className="text-xs text-muted-foreground font-normal">({devices.length})</span>
            </h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedDevice(null);
                setIsDeviceFormOpen(true);
              }}
              className="h-8 gap-1 rounded-xl text-xs font-semibold px-2.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{tDevices("addDeviceBtn")}</span>
            </Button>
          </div>

          {isLoadingDevices ? (
            <div className="space-y-2 pt-1">
              <div className="h-14 rounded-xl bg-muted/50 animate-pulse" />
            </div>
          ) : devices.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
              {tDevices("emptyDevicesBody")}
            </div>
          ) : (
            <div className="space-y-2 pt-1">
              {devices.map((dev) => {
                const CategoryIcon = getCategoryIcon(dev.category);
                return (
                  <div
                    key={dev.id}
                    className="flex items-start justify-between p-3 rounded-xl border bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                        <CategoryIcon className="h-4 w-4" />
                      </div>
                      <div className="space-y-1 min-w-0">
                        <p className="text-sm font-semibold truncate text-foreground">
                          {dev.brand_name || dev.brand_text ? `${dev.brand_name || dev.brand_text} ` : ""}
                          {dev.model}
                        </p>
                        {dev.color && (
                          <p className="text-xs text-muted-foreground">Color: {dev.color}</p>
                        )}
                        {dev.identifiers && dev.identifiers.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {dev.identifiers.map((ident, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 font-mono text-[11px] bg-background border px-2 py-0.5 rounded-md"
                              >
                                <span className="uppercase text-[9px] text-muted-foreground font-semibold">
                                  {ident.type}:
                                </span>
                                <span>{ident.value}</span>
                                {ident.luhn_valid === true && (
                                  <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                )}
                                {ident.luhn_valid === false && (
                                  <AlertCircle className="h-3 w-3 text-amber-500" />
                                )}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedDevice(dev);
                        setIsDeviceFormOpen(true);
                      }}
                      className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground shrink-0"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Repair History Card */}
        <div className="rounded-2xl border bg-card p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span>{t("repairHistoryTitle")}</span>
              <span className="text-xs text-muted-foreground font-normal">({customerJobs.length})</span>
            </h3>
          </div>

          {isLoadingJobs ? (
            <div className="space-y-2 pt-1">
              <div className="h-16 rounded-xl bg-muted/50 animate-pulse" />
            </div>
          ) : customerJobs.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
              {t("repairHistoryPlaceholder")}
            </div>
          ) : (
            <div className="space-y-2 pt-1">
              {customerJobs.map((j) => (
                <JobCard key={j.id} job={j} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Customer Sheet */}
      <CustomerFormSheet
        open={isEditCustomerOpen}
        onOpenChange={setIsEditCustomerOpen}
        customer={customer}
        onSaved={() => refetch()}
      />

      {/* Add / Edit Device Sheet */}
      <DeviceFormSheet
        open={isDeviceFormOpen}
        onOpenChange={setIsDeviceFormOpen}
        customerId={customer.id}
        device={selectedDevice}
        onSaved={() => refetchDevices()}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-xs sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{t("deleteConfirmTitle")}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {t("deleteConfirmBody", { name: customer.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2 pt-2 sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteOpen(false)}
              className="flex-1 rounded-xl"
            >
              {tCommon("cancel")}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteCustomer}
              className="flex-1 rounded-xl"
            >
              {tCommon("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CustomerDetailPage() {
  return (
    <Suspense fallback={<div className="p-4"><CardSkeleton /></div>}>
      <CustomerDetailContent />
    </Suspense>
  );
}
