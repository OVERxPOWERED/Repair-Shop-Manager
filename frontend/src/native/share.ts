import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

import { apiBlob } from "@/lib/api/client";
import { isNative } from "./platform";

export interface SharePdfOptions {
  url: string;
  filename: string;
  text?: string;
  dialogTitle?: string;
}

/**
 * Converts a Blob to a raw base64 string (without the data:... prefix).
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const commaIdx = result.indexOf(",");
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Fallback browser download using an ephemeral object URL.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

export interface ShareFileOptions {
  url: string;
  filename: string;
  mimeType?: string;
  text?: string;
  dialogTitle?: string;
}

/**
 * Shares any file (PDF, XLSX, etc.):
 * - Native: writes base64 to Cache and triggers native OS share sheet.
 * - Web: uses Web Share API if supported, or triggers file download.
 */
export async function shareFile(opts: ShareFileOptions): Promise<void> {
  const blob = await apiBlob(opts.url);

  if (isNative()) {
    const base64 = await blobToBase64(blob);
    const writeResult = await Filesystem.writeFile({
      path: opts.filename,
      data: base64,
      directory: Directory.Cache,
    });

    await Share.share({
      title: opts.dialogTitle ?? opts.filename,
      text: opts.text,
      files: [writeResult.uri],
      dialogTitle: opts.dialogTitle ?? opts.filename,
    });
    return;
  }

  // Web platform
  const fileType = opts.mimeType || blob.type || "application/octet-stream";
  if (typeof navigator !== "undefined" && typeof File !== "undefined") {
    const file = new File([blob], opts.filename, { type: fileType });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          title: opts.dialogTitle ?? opts.filename,
          text: opts.text,
          files: [file],
        });
        return;
      } catch (err: unknown) {
        // If user cancelled the share sheet, do not trigger fallback download
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
      }
    }
  }

  // Fallback to browser file download
  downloadBlob(blob, opts.filename);
}

/**
 * Shares a PDF document:
 * - Native: writes base64 PDF to Cache and triggers native OS share sheet.
 * - Web: uses Web Share API if supported, or triggers file download.
 */
export async function sharePdf(opts: SharePdfOptions): Promise<void> {
  return shareFile({ ...opts, mimeType: "application/pdf" });
}


/**
 * Formats a phone string into WhatsApp wa.me numeric format.
 * Prepends '91' if 10-digit Indian mobile number is provided.
 */
export function formatWhatsAppPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
}

/**
 * Opens WhatsApp chat with prefilled text:
 * - Native: opens via App.openUrl
 * - Web: opens via window.open
 */
export async function openWhatsApp(phone: string, text: string): Promise<void> {
  const digits = formatWhatsAppPhone(phone);
  const encodedText = encodeURIComponent(text);
  const waUrl = `https://wa.me/${digits}?text=${encodedText}`;

  if (typeof window !== "undefined") {
    const target = isNative() ? "_system" : "_blank";
    window.open(waUrl, target, "noopener,noreferrer");
  }
}
