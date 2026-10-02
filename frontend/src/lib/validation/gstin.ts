import { GST_STATE_MAP } from "@/lib/constants/gst-states";

export const GSTIN_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export function gstinCheckChar(first14: string): string {
  let total = 0;
  for (let i = 0; i < first14.length; i++) {
    const ch = first14[i];
    const idx = GSTIN_CHARS.indexOf(ch);
    const factor = i % 2 === 0 ? 1 : 2;
    const product = idx * factor;
    total += Math.floor(product / 36) + (product % 36);
  }
  return GSTIN_CHARS[(36 - (total % 36)) % 36];
}

export function validateGstin(value: string): string {
  const gstin = (value || "").trim().toUpperCase();
  if (!GSTIN_RE.test(gstin)) {
    throw new Error("GSTIN must be 15 characters, like 27AAPFU0939F1ZV.");
  }
  if (!GST_STATE_MAP[gstin.slice(0, 2)]) {
    throw new Error("GSTIN starts with an unknown state code.");
  }
  if (gstinCheckChar(gstin.slice(0, 14)) !== gstin[14]) {
    throw new Error("GSTIN check character is wrong. Please re-check the number.");
  }
  return gstin;
}

export function isValidGstin(value: string): boolean {
  try {
    validateGstin(value);
    return true;
  } catch {
    return false;
  }
}
