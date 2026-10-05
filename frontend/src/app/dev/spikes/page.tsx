"use client";

import React, { useState } from "react";
import { BleClient, ScanResult } from "@/native/bluetooth";
import { BarcodeScanner } from "@/native/barcode";
import { Camera, CameraResultType, CameraSource, TextRecognition } from "@/native/ocr";
import {
  canvasToEscPosRaster,
  chunkBytes,
  renderBilingualTestReceiptCanvas,
} from "@/lib/printer/rasterizer";
import { isValidIMEI } from "@/lib/validation/imei";

export default function DevSpikesPage() {
  const isDevEnabled = process.env.NEXT_PUBLIC_ENABLE_DEV_PAGES === "true";

  const [bleDevices, setBleDevices] = useState<ScanResult[]>([]);
  const [isScanningBle, setIsScanningBle] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [printPaperWidth, setPrintPaperWidth] = useState<384 | 576>(384);
  const [printStatus, setPrintStatus] = useState<string>("");
  const [isPrinting, setIsPrinting] = useState(false);

  const [barcodeResult, setBarcodeResult] = useState<{
    raw: string;
    validIMEI: boolean;
    format?: string;
  } | null>(null);
  const [barcodeStatus, setBarcodeStatus] = useState<string>("");

  const [ocrText, setOcrText] = useState<string>("");
  const [ocrCandidates, setOcrCandidates] = useState<
    { candidate: string; valid: boolean }[]
  >([]);
  const [ocrStatus, setOcrStatus] = useState<string>("");

  if (!isDevEnabled) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6 text-neutral-800">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Not available</h1>
          <p className="mt-2 text-sm text-neutral-500">
            Development spike pages are disabled in this environment.
          </p>
        </div>
      </main>
    );
  }

  // 1. BLE Printer Scan
  async function handleScanPrinters() {
    try {
      setIsScanningBle(true);
      setBleDevices([]);
      setPrintStatus("Initializing BLE...");

      await BleClient.initialize();
      setPrintStatus("Scanning for 10 seconds...");

      const foundMap = new Map<string, ScanResult>();

      await BleClient.requestLEScan({}, (result) => {
        if (!foundMap.has(result.device.deviceId)) {
          foundMap.set(result.device.deviceId, result);
          setBleDevices(Array.from(foundMap.values()));
        }
      });

      setTimeout(async () => {
        await BleClient.stopLEScan();
        setIsScanningBle(false);
        setPrintStatus(`Scan complete. Found ${foundMap.size} device(s).`);
      }, 10000);
    } catch (err: unknown) {
      setIsScanningBle(false);
      setPrintStatus(`BLE Scan error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 2. Print Test Receipt
  async function handlePrintTestReceipt() {
    if (!selectedDeviceId) {
      setPrintStatus("Error: Please select a printer device first.");
      return;
    }

    try {
      setIsPrinting(true);
      setPrintStatus("Connecting to printer...");

      await BleClient.connect(selectedDeviceId);
      const services = await BleClient.getServices(selectedDeviceId);

      let targetServiceUuid = "";
      let targetCharacteristicUuid = "";
      let supportsWriteWithoutResponse = false;

      for (const service of services) {
        for (const char of service.characteristics) {
          if (char.properties.writeWithoutResponse) {
            targetServiceUuid = service.uuid;
            targetCharacteristicUuid = char.uuid;
            supportsWriteWithoutResponse = true;
            break;
          } else if (char.properties.write) {
            targetServiceUuid = service.uuid;
            targetCharacteristicUuid = char.uuid;
            supportsWriteWithoutResponse = false;
            break;
          }
        }
        if (targetCharacteristicUuid) break;
      }

      if (!targetCharacteristicUuid) {
        throw new Error("No writable BLE characteristic found on printer.");
      }

      setPrintStatus("Rendering receipt canvas...");
      const canvas = renderBilingualTestReceiptCanvas(printPaperWidth);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get 2D canvas context");

      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const rasterBytes = canvasToEscPosRaster(imgData);

      const chunks = chunkBytes(rasterBytes, 20);
      setPrintStatus(`Sending ${rasterBytes.length} bytes in ${chunks.length} packets...`);

      const startTime = performance.now();

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        if (supportsWriteWithoutResponse) {
          await BleClient.writeWithoutResponse(
            selectedDeviceId,
            targetServiceUuid,
            targetCharacteristicUuid,
            new DataView(chunk.buffer, chunk.byteOffset, chunk.byteLength)
          );
        } else {
          await BleClient.write(
            selectedDeviceId,
            targetServiceUuid,
            targetCharacteristicUuid,
            new DataView(chunk.buffer, chunk.byteOffset, chunk.byteLength)
          );
        }
        await new Promise((resolve) => setTimeout(resolve, 20));
      }

      const elapsedMs = Math.round(performance.now() - startTime);
      setPrintStatus(
        `Print finished: ${rasterBytes.length} bytes in ${elapsedMs} ms (${chunks.length} chunks)`
      );

      await BleClient.disconnect(selectedDeviceId);
    } catch (err: unknown) {
      setPrintStatus(`Print error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsPrinting(false);
    }
  }

  // 3. Scan Barcode
  async function handleScanBarcode() {
    try {
      setBarcodeStatus("Requesting camera permission...");
      const perm = await BarcodeScanner.requestPermissions();
      if (perm.camera !== "granted") {
        setBarcodeStatus("Camera permission denied");
        return;
      }

      setBarcodeStatus("Scanning barcode...");
      const { barcodes } = await BarcodeScanner.scan();
      if (barcodes.length === 0) {
        setBarcodeStatus("No barcode detected");
        return;
      }

      const first = barcodes[0];
      const raw = first.rawValue || first.displayValue || "";
      const valid = isValidIMEI(raw);

      setBarcodeResult({
        raw,
        validIMEI: valid,
        format: first.format,
      });
      setBarcodeStatus("Scan successful");
    } catch (err: unknown) {
      setBarcodeStatus(`Barcode scan error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 4. OCR Photo
  async function handleOcrPhoto() {
    try {
      setOcrStatus("Capturing photo...");
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
      });

      if (!photo.path) {
        setOcrStatus("Error: No photo path available");
        return;
      }

      setOcrStatus("Running text recognition...");
      const result = await TextRecognition.processImage({
        path: photo.path,
      });

      const fullText = result.text || "";
      setOcrText(fullText);

      const matches = fullText.match(/\b\d{15}\b/g) || [];
      const evaluated = matches.map((m) => ({
        candidate: m,
        valid: isValidIMEI(m),
      }));

      setOcrCandidates(evaluated);
      setOcrStatus(`OCR complete. Found ${evaluated.length} 15-digit candidate(s).`);
    } catch (err: unknown) {
      setOcrStatus(`OCR error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-4 font-sans text-neutral-900">
      <header className="mb-6 rounded-2xl bg-white p-4 shadow-sm">
        <h1 className="text-xl font-bold">Hardware Spikes (0.8)</h1>
        <p className="text-xs text-neutral-500">
          Device test harness: BLE thermal printer &amp; IMEI Barcode/OCR
        </p>
      </header>

      <div className="space-y-6">
        {/* Section A: Thermal Printer */}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold">1 &amp; 2. BLE Thermal Printer</h2>
          <p className="mt-1 text-xs text-neutral-500">
            Scan BLE devices, connect, and stream Hindi receipt in 20-byte chunks.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={handleScanPrinters}
              disabled={isScanningBle}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {isScanningBle ? "Scanning (10s)..." : "Scan Printers"}
            </button>

            <button
              onClick={handlePrintTestReceipt}
              disabled={isPrinting || !selectedDeviceId}
              className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {isPrinting ? "Printing..." : "Print Test Receipt"}
            </button>

            <select
              value={printPaperWidth}
              onChange={(e) => setPrintPaperWidth(Number(e.target.value) as 384 | 576)}
              className="rounded-xl border border-neutral-200 px-3 py-2 text-sm"
            >
              <option value={384}>58mm Paper (384px)</option>
              <option value={576}>80mm Paper (576px)</option>
            </select>
          </div>

          {printStatus && (
            <p className="mt-2 text-xs font-mono text-neutral-600">{printStatus}</p>
          )}

          {bleDevices.length > 0 && (
            <div className="mt-3">
              <label className="text-xs font-medium text-neutral-600">Discovered Printers:</label>
              <div className="mt-1 space-y-1">
                {bleDevices.map((dev) => {
                  const id = dev.device.deviceId;
                  const name = dev.device.name || "Unknown device";
                  return (
                    <label
                      key={id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-100 p-2 text-xs hover:bg-neutral-50"
                    >
                      <input
                        type="radio"
                        name="printerDevice"
                        value={id}
                        checked={selectedDeviceId === id}
                        onChange={() => setSelectedDeviceId(id)}
                      />
                      <span className="font-semibold">{name}</span>
                      <span className="text-neutral-400">({id})</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Section B: Barcode Scanner */}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold">3. Scan Barcode (IMEI)</h2>
          <p className="mt-1 text-xs text-neutral-500">
            Open camera barcode scanner and test Luhn check algorithm.
          </p>

          <button
            onClick={handleScanBarcode}
            className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
          >
            Scan Barcode
          </button>

          {barcodeStatus && (
            <p className="mt-2 text-xs font-mono text-neutral-600">{barcodeStatus}</p>
          )}

          {barcodeResult && (
            <div className="mt-3 rounded-xl border border-neutral-100 bg-neutral-50 p-3 text-xs">
              <p>
                <span className="font-medium text-neutral-500">Raw Value: </span>
                <span className="font-mono font-bold">{barcodeResult.raw}</span>
              </p>
              <p className="mt-1">
                <span className="font-medium text-neutral-500">Format: </span>
                <span className="font-mono">{barcodeResult.format || "Unknown"}</span>
              </p>
              <p className="mt-1">
                <span className="font-medium text-neutral-500">Luhn Valid IMEI: </span>
                <span
                  className={
                    barcodeResult.validIMEI
                      ? "font-bold text-emerald-600"
                      : "font-bold text-red-600"
                  }
                >
                  {barcodeResult.validIMEI ? "YES (Valid 15-digit Luhn)" : "NO (Failed Luhn Check)"}
                </span>
              </p>
            </div>
          )}
        </section>

        {/* Section C: OCR Photo */}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold">4. OCR Photo (IMEI)</h2>
          <p className="mt-1 text-xs text-neutral-500">
            Capture camera photo, run ML Kit text recognition, and match 15-digit numbers.
          </p>

          <button
            onClick={handleOcrPhoto}
            className="mt-4 rounded-xl bg-purple-600 px-4 py-2 text-sm font-medium text-white"
          >
            OCR Photo
          </button>

          {ocrStatus && <p className="mt-2 text-xs font-mono text-neutral-600">{ocrStatus}</p>}

          {ocrCandidates.length > 0 && (
            <div className="mt-3">
              <label className="text-xs font-medium text-neutral-600">
                15-Digit IMEI Candidates:
              </label>
              <ul className="mt-1 space-y-1">
                {ocrCandidates.map((c, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-neutral-100 p-2 text-xs"
                  >
                    <span className="font-mono font-bold">{c.candidate}</span>
                    <span
                      className={
                        c.valid ? "font-bold text-emerald-600" : "font-bold text-red-600"
                      }
                    >
                      {c.valid ? "Valid Luhn" : "Invalid Luhn"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {ocrText && (
            <details className="mt-3 text-xs">
              <summary className="cursor-pointer font-medium text-neutral-500">
                Show full recognized text
              </summary>
              <pre className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg bg-neutral-100 p-2 font-mono text-[11px] text-neutral-700">
                {ocrText}
              </pre>
            </details>
          )}
        </section>

        {/* Section D: Dev Routes */}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold">Dev &amp; Testing Routes</h2>
          <p className="mt-1 text-xs text-neutral-500">
            Direct navigation to internal development routes.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href="/login/?dev=true"
              className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 transition-colors"
            >
              Open Phone Login (Dev Route) &rarr;
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
