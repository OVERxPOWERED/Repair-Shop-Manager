"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  User,
  Globe,
  Users,
  Smartphone,
  Laptop,
  Monitor,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Receipt,
  FileText,
  ShoppingBag,
  CreditCard,
  BarChart3,
  Building,
  Store,
  Trash2,
  Loader2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { useAuthStore, useCurrentShop } from "@/lib/auth/store";
import { useLocaleStore } from "@/i18n/store";
import { localeLabels, locales, type Locale } from "@/i18n/config";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

type Device = {
  id: string;
  device_id: string;
  platform: string;
  app_version: string;
  last_seen_at: string;
  is_current: boolean;
};

export default function MorePage() {
  const t = useTranslations("more");
  const router = useRouter();
  const queryClient = useQueryClient();

  const { user, signOut } = useAuthStore();
  const currentShop = useCurrentShop();
  const { locale, setLocale } = useLocaleStore();

  const [languageDialogOpen, setLanguageDialogOpen] = useState(false);
  const [devicesDialogOpen, setDevicesDialogOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [logoutAllConfirmOpen, setLogoutAllConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Devices query
  const {
    data: devices = [],
    isLoading: devicesLoading,
    error: devicesError,
    refetch: refetchDevices,
  } = useQuery<Device[]>({
    queryKey: ["auth", "devices"],
    queryFn: () => api<Device[]>("/auth/devices/", { shop: false }),
    enabled: devicesDialogOpen,
  });

  // Revoke device mutation
  const revokeMutation = useMutation({
    mutationFn: (deviceId: string) =>
      api(`/auth/devices/${deviceId}/`, { method: "DELETE", shop: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth", "devices"] });
    },
  });

  // Handle single device logout
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await api("/auth/logout/", { method: "POST", shop: false });
    } catch {
      // Proceed even if network error
    }
    await signOut();
    queryClient.clear();
    router.replace("/welcome/");
  };

  // Handle logout from all devices
  const handleLogoutAll = async () => {
    setIsLoggingOut(true);
    try {
      await api("/auth/logout-all/", { method: "POST", shop: false });
    } catch {
      // Proceed even if network error
    }
    await signOut();
    queryClient.clear();
    router.replace("/welcome/");
  };

  const getDeviceIcon = (platform: string) => {
    const p = platform.toLowerCase();
    if (p.includes("android") || p.includes("ios") || p.includes("mobile")) {
      return Smartphone;
    }
    if (p.includes("mac") || p.includes("windows") || p.includes("linux") || p.includes("web")) {
      return Laptop;
    }
    return Monitor;
  };

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "FP";

  return (
    <div className="flex-1 px-4 py-4 space-y-5 animate-in fade-in duration-300">
      {/* 1. User & Shop Profile Card */}
      <div className="bg-white rounded-2xl p-4 border border-neutral-200/90 shadow-sm flex items-center gap-3.5">
        <div className="w-13 h-13 rounded-2xl bg-neutral-900 text-white flex items-center justify-center font-bold text-lg tracking-wider shrink-0 shadow-inner">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-neutral-950 truncate">{user?.name || "Technician"}</h1>
            {currentShop?.role_name && (
              <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0">
                {currentShop.role_name}
              </Badge>
            )}
          </div>
          <p className="text-xs text-neutral-500 font-medium tabular-nums mt-0.5">
            +91 {user?.phone || ""}
          </p>
          {currentShop?.shop_name && (
            <p className="text-xs text-neutral-600 font-semibold truncate flex items-center gap-1 mt-1">
              <Store className="w-3 h-3 text-neutral-400 shrink-0" />
              <span>{currentShop.shop_name}</span>
            </p>
          )}
        </div>
      </div>

      {/* 2. Group: Sales & Billing */}
      <div className="space-y-1.5">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 px-1">
          {t("salesAndBilling")}
        </h2>
        <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm overflow-hidden divide-y divide-neutral-100">
          <button
            type="button"
            onClick={() => router.push("/invoices/")}
            className="w-full flex items-center justify-between p-3.5 hover:bg-neutral-50 active:bg-neutral-100 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-700">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-900">{t("invoices")}</p>
                <p className="text-[11px] text-neutral-500">{t("invoicesSubtitle")}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[10px] font-semibold text-neutral-500 border-neutral-200">
                v1.14
              </Badge>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </div>
          </button>
          <MenuRow icon={Receipt} title={t("pos")} soon />
          <MenuRow icon={CreditCard} title={t("quickBill")} soon />
          <MenuRow icon={FileText} title={t("roughRegister")} soon />
          <MenuRow icon={Smartphone} title={t("oldBuy")} soon />
          <MenuRow icon={BarChart3} title={t("salesHistory")} soon />
        </div>
      </div>

      {/* 3. Group: Finance & Reports */}
      <div className="space-y-1.5">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 px-1">
          {t("financeAndReports")}
        </h2>
        <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm overflow-hidden divide-y divide-neutral-100">
          <MenuRow icon={Building} title={t("khata")} soon />
          <MenuRow icon={Receipt} title={t("expenses")} soon />
          <MenuRow icon={BarChart3} title={t("reports")} soon />
          <MenuRow icon={ShieldCheck} title={t("gstReports")} soon />
        </div>
      </div>

      {/* 4. Group: Staff & Team */}
      <div className="space-y-1.5">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 px-1">
          {t("staffAndTeam")}
        </h2>
        <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm overflow-hidden divide-y divide-neutral-100">
          <button
            type="button"
            onClick={() => router.push("/more/staff/")}
            className="w-full flex items-center justify-between p-3.5 hover:bg-neutral-50 active:bg-neutral-100 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-700">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-900">{t("staff")}</p>
                <p className="text-[11px] text-neutral-500">{t("staffSubtitle")}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[10px] font-semibold text-neutral-500 border-neutral-200">
                v0.16
              </Badge>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </div>
          </button>
          <button
            type="button"
            onClick={() => router.push("/more/roles/")}
            className="w-full flex items-center justify-between p-3.5 hover:bg-neutral-50 active:bg-neutral-100 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-700">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-900">{t("roles")}</p>
                <p className="text-[11px] text-neutral-500">{t("rolesSubtitle")}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[10px] font-semibold text-neutral-500 border-neutral-200">
                v0.16
              </Badge>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </div>
          </button>
          <MenuRow icon={CreditCard} title={t("salary")} soon />
        </div>
      </div>

      {/* 5. Group: Business */}
      <div className="space-y-1.5">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 px-1">
          {t("business")}
        </h2>
        <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm overflow-hidden divide-y divide-neutral-100">
          <MenuRow icon={Store} title={t("shopProfile")} soon />
          <MenuRow icon={Building} title={t("branches")} soon />
        </div>
      </div>

      {/* 6. Group: Preferences & Settings */}
      <div className="space-y-1.5">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 px-1">
          {t("preferences")}
        </h2>
        <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm overflow-hidden divide-y divide-neutral-100">
          {/* Language selector */}
          <button
            type="button"
            onClick={() => setLanguageDialogOpen(true)}
            className="w-full flex items-center justify-between p-3.5 hover:bg-neutral-50 active:bg-neutral-100 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-700">
                <Globe className="w-4 h-4" />
              </div>
              <span className="text-sm font-semibold text-neutral-900">{t("language")}</span>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-neutral-500">
              <span>{localeLabels[locale]}</span>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </div>
          </button>
        </div>
      </div>

      {/* 7. Group: Account & Security */}
      <div className="space-y-1.5">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 px-1">
          {t("account")}
        </h2>
        <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm overflow-hidden divide-y divide-neutral-100">
          {/* Devices & Sessions */}
          <button
            type="button"
            onClick={() => setDevicesDialogOpen(true)}
            className="w-full flex items-center justify-between p-3.5 hover:bg-neutral-50 active:bg-neutral-100 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-700">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-900">{t("devices")}</p>
                <p className="text-[11px] text-neutral-500">{t("devicesSubtitle")}</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-400" />
          </button>

          {/* Log Out */}
          <button
            type="button"
            onClick={() => setLogoutConfirmOpen(true)}
            className="w-full flex items-center justify-between p-3.5 hover:bg-rose-50/50 active:bg-rose-100/50 transition-colors text-left text-rose-600"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                <LogOut className="w-4 h-4" />
              </div>
              <span className="text-sm font-bold">{t("logout")}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-rose-300" />
          </button>
        </div>
      </div>

      {/* Language Dialog */}
      <Dialog open={languageDialogOpen} onOpenChange={setLanguageDialogOpen}>
        <DialogContent className="sm:max-w-sm rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{t("language")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-3">
            {locales.map((loc) => {
              const isSelected = loc === locale;
              return (
                <button
                  key={loc}
                  type="button"
                  onClick={() => {
                    setLocale(loc);
                    setLanguageDialogOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border text-sm font-semibold transition-all ${
                    isSelected
                      ? "border-neutral-900 bg-neutral-900 text-white shadow-sm"
                      : "border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50"
                  }`}
                >
                  <span>{localeLabels[loc]}</span>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  )}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Devices & Sessions Dialog */}
      <Dialog open={devicesDialogOpen} onOpenChange={setDevicesDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{t("devices")}</DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              {t("devicesSubtitle")}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
            {devicesLoading ? (
              <div className="py-8 flex flex-col items-center justify-center text-neutral-400">
                <Loader2 className="w-6 h-6 animate-spin mb-2" />
                <span className="text-xs">Loading active sessions…</span>
              </div>
            ) : devicesError ? (
              <div className="py-6 text-center text-neutral-500 text-xs flex flex-col items-center">
                <AlertCircle className="w-6 h-6 text-rose-500 mb-1" />
                <span>Failed to load devices.</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchDevices()}
                  className="mt-3 text-xs"
                >
                  Retry
                </Button>
              </div>
            ) : devices.length === 0 ? (
              <div className="py-6 text-center text-neutral-400 text-xs">
                No active devices found.
              </div>
            ) : (
              devices.map((dev) => {
                const IconComponent = getDeviceIcon(dev.platform);
                return (
                  <div
                    key={dev.id}
                    className="p-3 rounded-2xl border border-neutral-200 bg-neutral-50/60 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-white border border-neutral-200/80 flex items-center justify-center text-neutral-700 shrink-0">
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-neutral-900 truncate">
                            {dev.platform}
                          </span>
                          {dev.is_current && (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[9px] font-bold px-1.5 py-0">
                              {t("currentDevice")}
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-neutral-500 truncate mt-0.5">
                          v{dev.app_version || "1.0"} • {new Date(dev.last_seen_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>

                    {!dev.is_current && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={revokeMutation.isPending}
                        onClick={() => revokeMutation.mutate(dev.id)}
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8 px-2.5 text-xs font-bold shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        {t("revoke")}
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter className="pt-2 border-t border-neutral-100 sm:justify-between flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setDevicesDialogOpen(false);
                setLogoutAllConfirmOpen(true);
              }}
              className="text-rose-600 border-rose-200 hover:bg-rose-50 text-xs font-bold"
            >
              {t("logoutAll")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setDevicesDialogOpen(false)}
              className="text-xs"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Logout Single Confirmation Dialog */}
      <Dialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
        <DialogContent className="sm:max-w-sm rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">{t("logout")}</DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              {t("logoutConfirm")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLogoutConfirmOpen(false)}
              disabled={isLoggingOut}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="rounded-xl text-xs font-bold"
            >
              {isLoggingOut ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  {t("loggingOut")}
                </>
              ) : (
                t("logout")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Logout All Confirmation Dialog */}
      <Dialog open={logoutAllConfirmOpen} onOpenChange={setLogoutAllConfirmOpen}>
        <DialogContent className="sm:max-w-sm rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-600">
              {t("logoutAll")}
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              {t("logoutAllConfirm")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLogoutAllConfirmOpen(false)}
              disabled={isLoggingOut}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleLogoutAll}
              disabled={isLoggingOut}
              className="rounded-xl text-xs font-bold"
            >
              {isLoggingOut ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  {t("loggingOut")}
                </>
              ) : (
                t("logoutAll")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MenuRow({
  icon: Icon,
  title,
  soon = false,
}: {
  icon: React.ElementType;
  title: string;
  soon?: boolean;
}) {
  const t = useTranslations("more");

  return (
    <div className="w-full flex items-center justify-between p-3.5 text-neutral-400 select-none">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-neutral-50 flex items-center justify-center text-neutral-400">
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-sm font-medium text-neutral-500">{title}</span>
      </div>
      {soon && (
        <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500 text-[10px] font-bold uppercase tracking-wider">
          {t("soon")}
        </span>
      )}
    </div>
  );
}
