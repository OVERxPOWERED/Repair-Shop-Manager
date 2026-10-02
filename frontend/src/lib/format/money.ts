const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 450000 -> "₹4,500.00". Paise must be an integer. */
export function formatPaise(paise: number): string {
  if (!Number.isSafeInteger(paise)) {
    throw new Error(`formatPaise expects integer paise, got ${paise}`);
  }
  return inr.format(paise / 100);
}

/** 24000000 -> "₹2.4L"; 1250000 -> "₹12.5K"; 45000 -> "₹450". */
export function formatPaiseCompact(paise: number): string {
  const rupees = paise / 100;
  const one = (n: number) => (Math.round(n * 10) / 10).toString();
  if (Math.abs(rupees) >= 1e7) return `₹${one(rupees / 1e7)}Cr`;
  if (Math.abs(rupees) >= 1e5) return `₹${one(rupees / 1e5)}L`;
  if (Math.abs(rupees) >= 1e3) return `₹${one(rupees / 1e3)}K`;
  return formatPaise(paise).replace(/\.00$/, "");
}

/** "4,500.5" -> 450050. Returns null for invalid input. Never uses floating point. */
export function rupeesToPaise(input: string): number | null {
  const s = input.replace(/[,\s₹]/g, "");
  const m = /^(\d{1,11})(?:\.(\d{0,2}))?$/.exec(s);
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
}

/** 450050 -> "4500.50" for prefilling inputs. */
export function paiseToRupeesInput(paise: number): string {
  const sign = paise < 0 ? "-" : "";
  const abs = Math.abs(paise);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}
