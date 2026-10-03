import { BleClient, type BleDevice, type ScanResult } from "@capacitor-community/bluetooth-le";

import { chunkBytes } from "@/lib/printer/rasterizer";
import { isNative } from "../platform";
import type { PrinterInfo, PrinterService } from "./types";
import { PrinterError } from "./types";

export class BlePrinterService implements PrinterService {
  private initialized = false;
  private connected = false;
  private connectedPrinter: PrinterInfo | null = null;
  private serviceUuid: string | null = null;
  private charUuid: string | null = null;
  private canWriteWithoutResponse = false;
  private mtuPayload = 20;

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    try {
      await BleClient.initialize();
      this.initialized = true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes("permission")) {
        throw new PrinterError("permission", "Bluetooth permission denied");
      }
      throw new PrinterError("unsupported", `Bluetooth initialization failed: ${msg}`);
    }
  }

  async scan(seconds = 4): Promise<PrinterInfo[]> {
    await this.ensureInitialized();
    const foundDevices = new Map<string, PrinterInfo>();

    try {
      await BleClient.requestLEScan({}, (result: ScanResult) => {
        const id = result.device.deviceId;
        const name = result.device.name || result.localName || `Thermal Printer (${id.slice(0, 6)})`;
        if (!foundDevices.has(id)) {
          foundDevices.set(id, {
            id,
            name,
            transport: "ble",
          });
        }
      });

      await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
      await BleClient.stopLEScan();
    } catch (err: unknown) {
      try {
        await BleClient.stopLEScan();
      } catch {
        // ignore cleanup error
      }
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes("permission")) {
        throw new PrinterError("permission", "Bluetooth scanning permission denied");
      }
      throw new PrinterError("not_found", `Bluetooth scan failed: ${msg}`);
    }

    return Array.from(foundDevices.values());
  }

  async connect(id: string): Promise<void> {
    await this.ensureInitialized();

    try {
      await BleClient.connect(id, (disconnectedDeviceId) => {
        if (this.connectedPrinter?.id === disconnectedDeviceId) {
          this.connected = false;
          this.connectedPrinter = null;
          this.serviceUuid = null;
          this.charUuid = null;
        }
      });

      // Try discovering services
      let services = await BleClient.getServices(id);
      if (!services || services.length === 0) {
        if (isNative()) {
          await BleClient.discoverServices(id);
          services = await BleClient.getServices(id);
        }
      }

      // Find first writable characteristic across all services
      let foundService: string | null = null;
      let foundChar: string | null = null;
      let writeWithoutResp = false;

      for (const service of services) {
        for (const char of service.characteristics) {
          if (char.properties.writeWithoutResponse) {
            foundService = service.uuid;
            foundChar = char.uuid;
            writeWithoutResp = true;
            break;
          } else if (char.properties.write && !foundChar) {
            foundService = service.uuid;
            foundChar = char.uuid;
            writeWithoutResp = false;
          }
        }
        if (writeWithoutResp) break;
      }

      if (!foundService || !foundChar) {
        await BleClient.disconnect(id).catch(() => {});
        throw new PrinterError(
          "unsupported",
          "No writable ESC/POS characteristic found on this device",
        );
      }

      this.serviceUuid = foundService;
      this.charUuid = foundChar;
      this.canWriteWithoutResponse = writeWithoutResp;
      this.connected = true;

      // Attempt to resolve friendly name
      let printerName = `Thermal Printer (${id.slice(0, 6)})`;
      try {
        const devices = await BleClient.getDevices([id]);
        if (devices.length > 0 && devices[0].name) {
          printerName = devices[0].name;
        }
      } catch {
        // Fallback to generic name
      }

      this.connectedPrinter = {
        id,
        name: printerName,
        transport: "ble",
      };
    } catch (err: unknown) {
      this.connected = false;
      this.connectedPrinter = null;
      if (err instanceof PrinterError) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes("permission")) {
        throw new PrinterError("permission", "Bluetooth connection permission denied");
      }
      throw new PrinterError("disconnected", `Failed to connect to printer: ${msg}`);
    }
  }

  async disconnect(): Promise<void> {
    if (!this.connectedPrinter) {
      this.connected = false;
      return;
    }

    try {
      await BleClient.disconnect(this.connectedPrinter.id);
    } catch {
      // Ignore disconnect errors
    } finally {
      this.connected = false;
      this.connectedPrinter = null;
      this.serviceUuid = null;
      this.charUuid = null;
    }
  }

  async write(bytes: Uint8Array): Promise<void> {
    if (!this.connected || !this.connectedPrinter || !this.serviceUuid || !this.charUuid) {
      throw new PrinterError("disconnected", "Printer is not connected");
    }

    const chunks = chunkBytes(bytes, this.mtuPayload);

    for (const chunk of chunks) {
      const dataView = new DataView(chunk.buffer, chunk.byteOffset, chunk.byteLength);
      try {
        if (this.canWriteWithoutResponse) {
          await BleClient.writeWithoutResponse(
            this.connectedPrinter.id,
            this.serviceUuid,
            this.charUuid,
            dataView,
          );
        } else {
          await BleClient.write(
            this.connectedPrinter.id,
            this.serviceUuid,
            this.charUuid,
            dataView,
          );
        }
        // Throttle 20ms between BLE chunk transmissions to prevent buffer overflow
        await new Promise((resolve) => setTimeout(resolve, 20));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.toLowerCase().includes("disconnect")) {
          this.connected = false;
          throw new PrinterError("disconnected", "Printer disconnected during transmission");
        }
        throw new PrinterError("write_failed", `Failed writing raster data to printer: ${msg}`);
      }
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  getConnectedPrinter(): PrinterInfo | null {
    return this.connectedPrinter;
  }
}
