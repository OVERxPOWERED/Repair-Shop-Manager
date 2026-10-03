import { getPref, removePref, setPref } from "../preferences";
import { BlePrinterService } from "./ble-printer";
import { FakePrinterService } from "./fake-printer";
import type { PrinterConfig, PrinterService } from "./types";

export * from "./types";
export * from "./ble-printer";
export * from "./fake-printer";

const PRINTER_CONFIG_PREF_KEY = "fixpro.printer";

const DEFAULT_PRINTER_CONFIG: PrinterConfig = {
  paperWidth: 58,
  autoCut: true,
  dithering: false,
};

let printerServiceInstance: PrinterService | null = null;

export function getPrinterService(): PrinterService {
  if (!printerServiceInstance) {
    printerServiceInstance = new BlePrinterService();
  }
  return printerServiceInstance;
}

export function setPrinterServiceForTest(service: PrinterService | null): void {
  printerServiceInstance = service;
}

export async function getStoredPrinterConfig(): Promise<PrinterConfig> {
  try {
    const raw = await getPref(PRINTER_CONFIG_PREF_KEY);
    if (!raw) return DEFAULT_PRINTER_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      printerId: parsed.printerId || undefined,
      printerName: parsed.printerName || undefined,
      paperWidth: parsed.paperWidth === 80 ? 80 : 58,
      autoCut: parsed.autoCut ?? true,
      dithering: Boolean(parsed.dithering),
    };
  } catch {
    return DEFAULT_PRINTER_CONFIG;
  }
}

export async function saveStoredPrinterConfig(config: PrinterConfig): Promise<void> {
  await setPref(PRINTER_CONFIG_PREF_KEY, JSON.stringify(config));
}

export async function clearStoredPrinterConfig(): Promise<void> {
  await removePref(PRINTER_CONFIG_PREF_KEY);
}
