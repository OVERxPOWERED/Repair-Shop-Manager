import { formatPaise } from "@/lib/format/money";
import { openWhatsApp } from "@/native/share";

export type MessageLocale = "en" | "hi" | "hi-Latn";

export interface JobMessageData {
  customerName?: string | null;
  shopName: string;
  jobNo: number | string;
  deviceName?: string | null;
  balancePaise?: number;
  trackingUrl?: string | null;
}

export interface InvoiceMessageData {
  customerName?: string | null;
  shopName: string;
  invoiceNo: string;
  totalPaise: number;
  balancePaise?: number;
  trackingUrl?: string | null;
}

/**
 * Normalizes any locale string to one of the 3 supported locales: en, hi, hi-Latn.
 */
export function normalizeLocale(locale?: string | null): MessageLocale {
  if (locale === "hi" || locale === "hi-Latn") {
    return locale;
  }
  return "en";
}

/**
 * Checks whether a customer phone number is masked or absent.
 */
export function isPhoneMasked(phone?: string | null): boolean {
  if (!phone || !phone.trim()) return true;
  return phone.includes("X") || phone.includes("*");
}

/**
 * Builds the "Job received" WhatsApp notification message.
 */
export function buildJobReceivedMessage(data: JobMessageData, localeInput?: string | null): string {
  const locale = normalizeLocale(localeInput);
  const name = data.customerName?.trim() || (locale === "hi" ? "ग्राहक" : "Customer");
  const device = data.deviceName?.trim() || (locale === "hi" ? "डिवाइस" : "device");
  const shop = data.shopName.trim();
  const jobNo = data.jobNo;
  const trackingUrl = data.trackingUrl?.trim() || "";

  if (locale === "hi") {
    const trackingLine = trackingUrl ? `\nरिपेयर की स्थिति यहाँ ट्रैक करें: ${trackingUrl}` : "";
    return `नमस्ते ${name}, आपका डिवाइस ${device} ${shop} पर रिपेयर के लिए प्राप्त हो गया है (जॉब #${jobNo})।${trackingLine}`;
  }

  if (locale === "hi-Latn") {
    const trackingLine = trackingUrl ? `\nLive repair status yahan track karein: ${trackingUrl}` : "";
    return `Namaste ${name}, aapka device ${device} ${shop} par repair ke liye receive ho gaya hai (Job #${jobNo}).${trackingLine}`;
  }

  // Default: en
  const trackingLine = trackingUrl ? `\nTrack real-time repair progress here: ${trackingUrl}` : "";
  return `Hello ${name}, your device ${device} has been received for repair at ${shop} (Job #${jobNo}).${trackingLine}`;
}

/**
 * Builds the "Ready for pickup" WhatsApp notification message.
 */
export function buildReadyForPickupMessage(data: JobMessageData, localeInput?: string | null): string {
  const locale = normalizeLocale(localeInput);
  const name = data.customerName?.trim() || (locale === "hi" ? "ग्राहक" : "Customer");
  const device = data.deviceName?.trim() || (locale === "hi" ? "डिवाइस" : "device");
  const shop = data.shopName.trim();
  const jobNo = data.jobNo;
  const balance = formatPaise(data.balancePaise ?? 0);
  const trackingUrl = data.trackingUrl?.trim() || "";

  if (locale === "hi") {
    const trackingLine = trackingUrl ? `\nविवरण देखें: ${trackingUrl}` : "";
    return `नमस्ते ${name}, आपका डिवाइस ${device} रिपेयर हो चुका है और ${shop} पर पिकअप के लिए तैयार है (जॉब #${jobNo})। शेष देय राशि: ${balance}।${trackingLine}`;
  }

  if (locale === "hi-Latn") {
    const trackingLine = trackingUrl ? `\nDetails dekhein: ${trackingUrl}` : "";
    return `Namaste ${name}, aapka device ${device} repair ho chuka hai aur ${shop} par pickup ke liye ready hai (Job #${jobNo}). Balance due: ${balance}.${trackingLine}`;
  }

  // Default: en
  const trackingLine = trackingUrl ? `\nTrack details: ${trackingUrl}` : "";
  return `Hello ${name}, your device ${device} is repaired and ready for pickup at ${shop} (Job #${jobNo}). Balance due: ${balance}.${trackingLine}`;
}

/**
 * Builds the "Invoice shared" WhatsApp notification message.
 */
export function buildInvoiceSharedMessage(data: InvoiceMessageData, localeInput?: string | null): string {
  const locale = normalizeLocale(localeInput);
  const name = data.customerName?.trim() || (locale === "hi" ? "ग्राहक" : "Customer");
  const shop = data.shopName.trim();
  const invoiceNo = data.invoiceNo;
  const total = formatPaise(data.totalPaise);
  const balance = formatPaise(data.balancePaise ?? 0);
  const trackingUrl = data.trackingUrl?.trim() || "";

  if (locale === "hi") {
    const trackingLine = trackingUrl ? `\nरिपेयर ट्रैक करें: ${trackingUrl}` : "";
    return `नमस्ते ${name}, ${shop} से आपका बिल ${invoiceNo} कुल राशि ${total} का है। शेष देय राशि: ${balance}।${trackingLine}\nहमारी सेवा चुनने के लिए धन्यवाद!`;
  }

  if (locale === "hi-Latn") {
    const trackingLine = trackingUrl ? `\nRepair track karein: ${trackingUrl}` : "";
    return `Namaste ${name}, ${shop} se aapka invoice ${invoiceNo} total amount ${total} ka hai. Balance due: ${balance}.${trackingLine}\nHumari service choose karne ke liye dhanyavaad!`;
  }

  // Default: en
  const trackingLine = trackingUrl ? `\nTrack repair: ${trackingUrl}` : "";
  return `Hello ${name}, here is your invoice ${invoiceNo} for ${total} from ${shop}. Balance due: ${balance}.${trackingLine}\nThank you for choosing us!`;
}

/**
 * Convenience helper to open WhatsApp for a job.
 */
export async function sendJobWhatsApp(
  phone: string,
  kind: "received" | "ready",
  data: JobMessageData,
  locale?: string | null,
): Promise<void> {
  const text = kind === "received" ? buildJobReceivedMessage(data, locale) : buildReadyForPickupMessage(data, locale);
  await openWhatsApp(phone, text);
}

/**
 * Convenience helper to open WhatsApp for an invoice.
 */
export async function sendInvoiceWhatsApp(
  phone: string,
  data: InvoiceMessageData,
  locale?: string | null,
): Promise<void> {
  const text = buildInvoiceSharedMessage(data, locale);
  await openWhatsApp(phone, text);
}
