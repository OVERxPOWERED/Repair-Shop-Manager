import { isValidIMEI, calculateIMEICheckDigit } from "./imei";

const LOOKALIKES: Record<string, string> = {
  O: "0",
  o: "0",
  D: "0",
  I: "1",
  l: "1",
  "|": "1",
  Z: "2",
  S: "5",
  B: "8",
};

export interface ImeiCandidate {
  value: string;
  luhnValid: boolean;
  convertedFromImeisv?: boolean;
}

/**
 * Finds 15-digit IMEI candidates in OCR/barcode text.
 * Luhn-valid ones first, then the rest.
 * Also handles 16/17-digit IMEISV tokens by computing the 15th Luhn digit.
 */
export function extractImeiCandidates(text: string): ImeiCandidate[] {
  if (!text) return [];

  const tokens = text.split(/[^0-9A-Za-z|]+/);
  const seen = new Set<string>();
  const out: ImeiCandidate[] = [];

  for (const token of tokens) {
    const digitCount = (token.match(/\d/g) ?? []).length;
    if (token.length < 14 || digitCount < 10) continue; // mostly digits only

    const fixed = token.replace(/[OoDIl|ZSB]/g, (c) => LOOKALIKES[c] ?? c).replace(/\D/g, "");

    // 1. Sliding windows of length 15
    for (let i = 0; i + 15 <= fixed.length; i += 1) {
      const candidate = fixed.slice(i, i + 15);
      if (seen.has(candidate)) continue;
      seen.add(candidate);
      out.push({ value: candidate, luhnValid: isValidIMEI(candidate) });
      if (fixed.length === 15) break;
    }

    // 2. If length is 16 or 17 and no valid 15-digit candidate found yet, check for IMEISV
    if ((fixed.length === 16 || fixed.length === 17) && !out.some((c) => c.luhnValid)) {
      const tac14 = fixed.slice(0, 14);
      const checkDigit = calculateIMEICheckDigit(tac14);
      const converted = `${tac14}${checkDigit}`;
      if (!seen.has(converted)) {
        seen.add(converted);
        out.push({
          value: converted,
          luhnValid: true,
          convertedFromImeisv: true,
        });
      }
    }
  }

  return out.sort((a, b) => Number(b.luhnValid) - Number(a.luhnValid));
}
