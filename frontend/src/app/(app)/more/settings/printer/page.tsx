"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ChevronLeft,
  Printer,
  Bluetooth,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Scissors,
  FileText,
  Sparkles,
  Loader2,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { usePermission } from "@/lib/auth/store";
import { useCurrentShopDetails } from "@/features/billing/api";
import { isNative } from "@/native/platform";
import {
  type PaperWidth,
  type PrinterInfo,
  type PrinterConfig,
  PrinterError,
} from "@/native/printer/types";
import {
  getPrinterService,
  getStoredPrinterConfig,
  saveStoredPrinterConfig,
  clearStoredPrinterConfig,
} from "@/native/printer";
import { testReceiptModel } from "@/lib/printer/receipt";
import { printReceipt } from "@/lib/printer/render-canvas";

export default function PrinterSettingsPage() {
  const t = useTranslations("printer");
  const tNav = useTranslations("nav");
  const router = useRouter();

  const canConfigure = usePermission("printers.configure");
  const { data: currentShop } = useCurrentShopDetails();

  const [config, setConfig] = useState<PrinterConfig>({
    paperWidth: 58,
    autoCut: true,
    dithering: false,
  });

  const [printers, setPrinters] = useState<PrinterInfo[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPrintingTest, setIsPrintingTest] = useState(false);
  const [connectedPrinter, setConnectedPrinter] = useState<PrinterInfo | null>(null);

  // Load saved config on mount
  useEffect(() => {
    async function loadConfig() {
      const stored = await getStoredPrinterConfig();
      setConfig(stored);

      const service = getPrinterService();
      if (service.isConnected()) {
        setConnectedPrinter(service.getConnectedPrinter());
      }
    }
    loadConfig();
  }, []);

  const handleScan = async () => {
    setIsScanning(true);
    try {
      const service = getPrinterService();
      const results = await service.scan(4);
      setPrinters(results);
      if (results.length === 0) {
        toast.info(t("noPrintersFound"));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("scanFailed");
      toast.error(msg);
    } finally {
      setIsScanning(false);
    }
  };

  const handleConnect = async (printer: PrinterInfo) => {
    setIsConnecting(true);
    try {
      const service = getPrinterService();
      await service.connect(printer.id);
      setConnectedPrinter(printer);

      const updated: PrinterConfig = {
        ...config,
        printerId: printer.id,
        printerName: printer.name,
      };
      setConfig(updated);
      await saveStoredPrinterConfig(updated);
      toast.success(t("connectedToast", { name: printer.name }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("connectFailed");
      toast.error(msg);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const service = getPrinterService();
      await service.disconnect();
      setConnectedPrinter(null);
      toast.success(t("disconnectedToast"));
    } catch {
      toast.error(t("disconnectFailed"));
    }
  };

  const handleForget = async () => {
    await handleDisconnect();
    await clearStoredPrinterConfig();
    setConfig({
      paperWidth: 58,
      autoCut: true,
      dithering: false,
    });
    toast.success(t("forgotToast"));
  };

  const handleUpdatePaperWidth = async (width: PaperWidth) => {
    const updated = { ...config, paperWidth: width };
    setConfig(updated);
    await saveStoredPrinterConfig(updated);
  };

  const handleUpdateAutoCut = async (autoCut: boolean) => {
    const updated = { ...config, autoCut };
    setConfig(updated);
    await saveStoredPrinterConfig(updated);
  };

  const handleTestPrint = async () => {
    setIsPrintingTest(true);
    try {
      const model = testReceiptModel(currentShop);
      if (isNative() || getPrinterService().isConnected()) {
        await printReceipt(model, {
          paperWidth: config.paperWidth,
          autoCut: config.autoCut,
          dithering: config.dithering,
        });
        toast.success(t("testPrintSuccess"));
      } else {
        // Web fallback: open web print route
        router.push(`/print/receipt/?type=test&size=${config.paperWidth}`);
      }
    } catch (err: unknown) {
      if (err instanceof PrinterError && err.reason === "not_found") {
        toast.error(t("notConfiguredError"));
      } else {
        const msg = err instanceof Error ? err.message : t("testPrintFailed");
        toast.error(msg);
      }
    } finally {
      setIsPrintingTest(false);
    }
  };

  return (
    <div className="flex-1 px-4 py-4 space-y-4 max-w-xl mx-auto pb-28">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push("/more/")}
          className="flex items-center gap-1 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>{tNav("more")}</span>
        </button>
      </div>

      <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
        <div>
          <h1 className="text-xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight">
            {t("title")}
          </h1>
          <p className="text-xs text-neutral-500 font-medium mt-0.5">
            {t("subtitle")}
          </p>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
          <Printer className="w-5 h-5" />
        </div>
      </div>

      {/* Connected Printer Card */}
      <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-card p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-2xl flex items-center justify-center ${
                connectedPrinter
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
                  : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800"
              }`}
            >
              <Bluetooth className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                {connectedPrinter?.name || config.printerName || t("noPrinterConfigured")}
              </p>
              <p className="text-xs text-neutral-500">
                {connectedPrinter ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {t("statusConnected")}
                  </span>
                ) : config.printerId ? (
                  t("statusSavedOffline")
                ) : (
                  t("statusNotPaired")
                )}
              </p>
            </div>
          </div>

          {connectedPrinter ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              className="text-xs font-semibold rounded-xl h-8 text-neutral-600"
            >
              {t("disconnectBtn")}
            </Button>
          ) : config.printerId ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isConnecting}
              onClick={() =>
                handleConnect({
                  id: config.printerId!,
                  name: config.printerName || "Thermal Printer",
                  transport: "ble",
                })
              }
              className="text-xs font-semibold rounded-xl h-8"
            >
              {isConnecting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                t("reconnectBtn")
              )}
            </Button>
          ) : null}
        </div>

        {config.printerId && (
          <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex justify-end">
            <button
              type="button"
              onClick={handleForget}
              className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t("forgetPrinterBtn")}</span>
            </button>
          </div>
        )}
      </div>

      {/* Available Bluetooth Devices (Scan) */}
      <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-card p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              {t("scanSectionTitle")}
            </h2>
            <p className="text-[11px] text-neutral-400">
              {t("scanSectionSubtitle")}
            </p>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={handleScan}
            disabled={isScanning}
            className="rounded-xl text-xs h-8 gap-1.5 font-bold bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
          >
            {isScanning ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            <span>{isScanning ? t("scanningBtn") : t("scanBtn")}</span>
          </Button>
        </div>

        {printers.length === 0 ? (
          <div className="py-4 text-center space-y-1">
            <p className="text-xs text-neutral-400">
              {isScanning ? t("searchingText") : t("pressScanPrompt")}
            </p>
          </div>
        ) : (
          <div className="space-y-2 pt-1">
            {printers.map((p) => {
              const isCurrent = connectedPrinter?.id === p.id;
              return (
                <div
                  key={p.id}
                  className="p-3 rounded-2xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-neutral-900 dark:text-neutral-100 truncate">
                      {p.name}
                    </p>
                    <p className="text-[10px] text-neutral-400 font-mono mt-0.5">
                      {p.id}
                    </p>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant={isCurrent ? "outline" : "default"}
                    disabled={isConnecting || isCurrent}
                    onClick={() => handleConnect(p)}
                    className="rounded-xl text-xs h-8 px-3 font-semibold"
                  >
                    {isCurrent ? t("connectedTag") : t("connectBtn")}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Receipt & Paper Configuration */}
      <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-card p-5 shadow-sm space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500 pb-2 border-b border-neutral-100 dark:border-neutral-800">
          {t("hardwareConfigTitle")}
        </h2>

        {/* Paper Width Selection */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
            {t("paperWidthLabel")}
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleUpdatePaperWidth(58)}
              className={`p-3 rounded-2xl border text-left transition-all ${
                config.paperWidth === 58
                  ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900 shadow-sm"
                  : "border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 hover:border-neutral-300"
              }`}
            >
              <p className="text-xs font-bold">{t("size58mm")}</p>
              <p className="text-[11px] opacity-75 mt-0.5">{t("size58mmDesc")}</p>
            </button>

            <button
              type="button"
              onClick={() => handleUpdatePaperWidth(80)}
              className={`p-3 rounded-2xl border text-left transition-all ${
                config.paperWidth === 80
                  ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900 shadow-sm"
                  : "border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 hover:border-neutral-300"
              }`}
            >
              <p className="text-xs font-bold">{t("size80mm")}</p>
              <p className="text-[11px] opacity-75 mt-0.5">{t("size80mmDesc")}</p>
            </button>
          </div>
        </div>

        {/* Auto-Cut Switch */}
        <div className="flex items-center justify-between pt-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <Scissors className="w-3.5 h-3.5 text-neutral-500" />
              <Label className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                {t("autoCutLabel")}
              </Label>
            </div>
            <p className="text-[11px] text-neutral-500">
              {t("autoCutDesc")}
            </p>
          </div>
          <Switch
            checked={config.autoCut}
            onCheckedChange={handleUpdateAutoCut}
          />
        </div>
      </div>

      {/* Test Print Action */}
      <div className="rounded-3xl border border-sky-100 dark:border-sky-900/60 bg-sky-50/50 dark:bg-sky-950/20 p-5 shadow-sm space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-xs text-sky-900 dark:text-sky-300">
              <Sparkles className="w-4 h-4 text-sky-600" />
              <span>{t("testPrintCardTitle")}</span>
            </div>
            <p className="text-xs text-sky-700 dark:text-sky-400">
              {t("testPrintCardDesc")}
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={handleTestPrint}
          disabled={isPrintingTest}
          className="w-full rounded-2xl h-11 text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-md gap-2"
        >
          {isPrintingTest ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Printer className="w-4 h-4" />
          )}
          <span>{isPrintingTest ? t("printingTestBtn") : t("runTestPrintBtn")}</span>
        </Button>
      </div>
    </div>
  );
}
