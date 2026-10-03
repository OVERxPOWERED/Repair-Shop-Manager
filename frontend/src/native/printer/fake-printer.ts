import type { PrinterInfo, PrinterService } from "./types";
import { PrinterError } from "./types";

export class FakePrinterService implements PrinterService {
  private connected = false;
  private connectedPrinter: PrinterInfo | null = null;
  public writtenBytes: Uint8Array[] = [];
  public mockPrinters: PrinterInfo[] = [
    { id: "mock-ble-01", name: "POS-58 Mock", transport: "ble" },
    { id: "mock-ble-02", name: "TVS-RP3150 Mock", transport: "ble" },
  ];

  async scan(_seconds = 2): Promise<PrinterInfo[]> {
    return this.mockPrinters;
  }

  async connect(id: string): Promise<void> {
    const found = this.mockPrinters.find((p) => p.id === id);
    if (!found) {
      throw new PrinterError("not_found", `Printer ${id} not found`);
    }
    this.connected = true;
    this.connectedPrinter = found;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.connectedPrinter = null;
  }

  async write(bytes: Uint8Array): Promise<void> {
    if (!this.connected) {
      throw new PrinterError("disconnected", "Printer is not connected");
    }
    this.writtenBytes.push(new Uint8Array(bytes));
  }

  isConnected(): boolean {
    return this.connected;
  }

  getConnectedPrinter(): PrinterInfo | null {
    return this.connectedPrinter;
  }

  getCombinedWrittenBytes(): Uint8Array {
    const totalLen = this.writtenBytes.reduce((acc, b) => acc + b.length, 0);
    const result = new Uint8Array(totalLen);
    let offset = 0;
    for (const chunk of this.writtenBytes) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  }

  clear(): void {
    this.writtenBytes = [];
  }
}
