export type PaperWidth = 58 | 80;

export const DOTS: Record<PaperWidth, number> = {
  58: 384,
  80: 576,
};

export type PrinterTransport = "ble" | "classic";

export interface PrinterInfo {
  id: string;
  name: string;
  transport: PrinterTransport;
}

export type PrinterErrorReason =
  | "not_found"
  | "disconnected"
  | "permission"
  | "unsupported"
  | "write_failed";

export class PrinterError extends Error {
  constructor(
    public reason: PrinterErrorReason,
    message?: string,
  ) {
    super(message ?? reason);
    this.name = "PrinterError";
  }
}

export interface PrinterConfig {
  printerId?: string;
  printerName?: string;
  paperWidth: PaperWidth;
  autoCut: boolean;
  dithering?: boolean;
}

export interface PrinterService {
  scan(seconds?: number): Promise<PrinterInfo[]>;
  connect(id: string): Promise<void>;
  disconnect(): Promise<void>;
  write(bytes: Uint8Array): Promise<void>;
  isConnected(): boolean;
  getConnectedPrinter(): PrinterInfo | null;
}
