import { BarcodeScanner, BarcodeFormat } from "@capacitor-mlkit/barcode-scanning";
import { isNative, NativeUnavailableError } from "./platform";

export { BarcodeScanner, BarcodeFormat };

/**
 * Scans a 1D or 2D barcode using Google ML Kit on native.
 * Requests camera permission if needed.
 * Returns scanned barcode string or null if cancelled / dismissed.
 * Throws NativeUnavailableError when called on web.
 */
export async function scanBarcode(): Promise<string | null> {
  if (!isNative()) {
    throw new NativeUnavailableError("Barcode scanner");
  }

  try {
    const { camera } = await BarcodeScanner.requestPermissions();
    if (camera !== "granted") {
      return null;
    }

    const { barcodes } = await BarcodeScanner.scan({
      formats: [
        BarcodeFormat.Code128,
        BarcodeFormat.Code39,
        BarcodeFormat.Ean13,
        BarcodeFormat.DataMatrix,
        BarcodeFormat.QrCode,
      ],
    });

    if (!barcodes || barcodes.length === 0) {
      return null;
    }

    const first = barcodes[0];
    return first.rawValue || first.displayValue || null;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.toLowerCase().includes("cancel") || message.toLowerCase().includes("dismiss")) {
      return null;
    }
    throw err;
  }
}
