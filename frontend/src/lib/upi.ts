/**
 * Builds an NPCI-compliant UPI deep link URL.
 * Spec: upi://pay?pa=...&pn=...&am=...&cu=INR&tn=...
 * TODO(verify): test parameter parsing with real UPI applications.
 */

export interface UpiParams {
  vpa: string;
  payeeName: string;
  amountPaise: number;
  note: string;
}

export function buildUpiUri({ vpa, payeeName, amountPaise, note }: UpiParams): string {
  const abs = Math.abs(amountPaise);
  const rupeesStr = `${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;

  const params: Record<string, string> = {
    pa: vpa,
    pn: payeeName.slice(0, 50),
    am: rupeesStr,
    cu: "INR",
    tn: note.slice(0, 50),
  };

  const query = Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");

  return `upi://pay?${query}`;
}
