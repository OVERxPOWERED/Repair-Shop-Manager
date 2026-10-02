import { describe, expect, it } from "vitest";
import {
  formatPaise,
  formatPaiseCompact,
  paiseToRupeesInput,
  rupeesToPaise,
} from "./money";

describe("Money formatters (Integer Paise)", () => {
  it("formats integer paise to INR currency display", () => {
    expect(formatPaise(450000)).toBe("₹4,500.00");
    // Standard Indian number system: lakhs, crores
    expect(formatPaise(1234567890)).toBe("₹1,23,45,678.90");
  });

  it("throws for non-integer paise", () => {
    expect(() => formatPaise(1.5)).toThrow(/expects integer paise/);
    expect(() => formatPaise(NaN)).toThrow(/expects integer paise/);
  });

  it("formats compact Indian currency representation (Cr, L, K)", () => {
    expect(formatPaiseCompact(24000000)).toBe("₹2.4L");
    expect(formatPaiseCompact(1250000)).toBe("₹12.5K");
    expect(formatPaiseCompact(45000)).toBe("₹450");
    expect(formatPaiseCompact(1500000000)).toBe("₹1.5Cr");
  });

  it("converts rupees string to integer paise safely", () => {
    expect(rupeesToPaise("4,500.5")).toBe(450050);
    expect(rupeesToPaise("₹4,500.50")).toBe(450050);
    expect(rupeesToPaise("500")).toBe(50000);
    expect(rupeesToPaise("0.05")).toBe(5);
  });

  it("returns null for invalid rupee strings", () => {
    expect(rupeesToPaise("1.234")).toBeNull();
    expect(rupeesToPaise("abc")).toBeNull();
    expect(rupeesToPaise("")).toBeNull();
  });

  it("formats paise to rupees input field prefill string", () => {
    expect(paiseToRupeesInput(450050)).toBe("4500.50");
    expect(paiseToRupeesInput(5)).toBe("0.05");
    expect(paiseToRupeesInput(0)).toBe("0.00");
    expect(paiseToRupeesInput(-1250)).toBe("-12.50");
  });
});
