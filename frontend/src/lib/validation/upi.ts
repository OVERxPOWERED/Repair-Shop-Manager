export const UPI_ID_RE = /^[A-Za-z0-9.\-_]{2,256}@[A-Za-z][A-Za-z0-9.\-]{1,63}$/;

export function validateUpiId(value: string): string {
  const upi = (value || "").trim();
  if (!upi) return "";
  if (!UPI_ID_RE.test(upi)) {
    throw new Error("UPI ID looks wrong. Example: shopname@okaxis");
  }
  return upi;
}

export function isValidUpiId(value: string): boolean {
  const upi = (value || "").trim();
  if (!upi) return true;
  return UPI_ID_RE.test(upi);
}
