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
