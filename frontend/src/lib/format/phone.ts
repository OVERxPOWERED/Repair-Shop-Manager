/**
 * Formats an E.164 phone number for readable display in Indian repair shop context.
 * +919876543210 -> "+91 98765 43210".
 * Non-+91 numbers are returned unchanged.
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.trim();
  if (cleaned.startsWith("+91") && cleaned.length === 13) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 8)} ${cleaned.slice(8)}`;
  }
  return cleaned;
}

/**
 * Converts a phone number to pure digits for WhatsApp URL schemes (e.g. https://wa.me/<digits>).
 * +919876543210 -> "919876543210".
 */
export function toWhatsAppDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

const E164 = /^\+[1-9]\d{7,14}$/;

/**
 * Normalizes an Indian or international phone number to E.164.
 * '98765 43210' -> '+919876543210'.
 * Throws an Error if the resulting string is not E.164.
 */
export function normalizePhone(value: string): string {
  let cleaned = (value || "").replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("00")) {
    cleaned = "+" + cleaned.slice(2);
  }
  if (!cleaned.startsWith("+")) {
    if (cleaned.length === 11 && cleaned.startsWith("0")) {
      cleaned = cleaned.slice(1);
    }
    cleaned = cleaned.length === 10 ? `+91${cleaned}` : `+${cleaned}`;
  }
  if (!E164.test(cleaned)) {
    throw new Error("Enter a valid phone number, for example +919876543210.");
  }
  return cleaned;
}

