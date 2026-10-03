import { describe, it, expect } from "vitest";
import { extractImeiCandidates } from "./imei-extract";

describe("extractImeiCandidates", () => {
  it("extracts valid IMEI with OCR letter lookalikes replaced (e.g. O -> 0)", () => {
    // 490154203237518 is a known valid Luhn IMEI
    const candidates = extractImeiCandidates("IMEI 49O154203237518");
    expect(candidates).toHaveLength(1);
    expect(candidates[0].value).toBe("490154203237518");
    expect(candidates[0].luhnValid).toBe(true);
  });

  it("handles multiple lookalikes (I, l, |, Z, S, B, D)", () => {
    // Replace 356938035643809 with some lookalikes
    // 35693B035643B09 -> B -> 8
    const candidates = extractImeiCandidates("Device IMEI: 35693B035643B09");
    expect(candidates).toHaveLength(1);
    expect(candidates[0].value).toBe("356938035643809");
    expect(candidates[0].luhnValid).toBe(true);
  });

  it("documents that split numbers across spaces are not joined (user retypes)", () => {
    const candidates = extractImeiCandidates("IMEI1: 49015420323751 8");
    // "49015420323751" has 14 digits, "8" has 1 digit, so neither is a 15-digit window
    const exact15 = candidates.filter((c) => !c.convertedFromImeisv);
    expect(exact15).toHaveLength(0);
  });

  it("extracts two IMEIs in one text, sorting Luhn-valid ones first", () => {
    // One valid (490154203237518) and one with invalid check digit (490154203237519)
    const text = "SIM1: 490154203237519\nSIM2: 490154203237518";
    const candidates = extractImeiCandidates(text);
    expect(candidates).toHaveLength(2);
    expect(candidates[0].value).toBe("490154203237518");
    expect(candidates[0].luhnValid).toBe(true);
    expect(candidates[1].value).toBe("490154203237519");
    expect(candidates[1].luhnValid).toBe(false);
  });

  it("extracts from a 16-digit run and prioritizes Luhn-valid window", () => {
    // Prefix a valid 15-digit IMEI with a digit '1': 1 + 490154203237518 = 16 digits
    const text = "1490154203237518";
    const candidates = extractImeiCandidates(text);
    expect(candidates.length).toBeGreaterThanOrEqual(1);
    // The valid window 490154203237518 should be sorted first
    expect(candidates[0].value).toBe("490154203237518");
    expect(candidates[0].luhnValid).toBe(true);
  });

  it("handles 16-digit IMEISV barcodes by calculating the 15th check digit", () => {
    // 14 digits: 49015420323751 + SV 01 -> total 16 digits: 4901542032375101
    // Converted: 49015420323751 + 8 (check digit) = 490154203237518
    const text = "4901542032375101";
    const candidates = extractImeiCandidates(text);
    const imeisvCandidate = candidates.find((c) => c.convertedFromImeisv);
    expect(imeisvCandidate).toBeDefined();
    expect(imeisvCandidate?.value).toBe("490154203237518");
    expect(imeisvCandidate?.luhnValid).toBe(true);
  });

  it("returns empty array for junk or text without numbers", () => {
    expect(extractImeiCandidates("Hello FixPro world!")).toEqual([]);
    expect(extractImeiCandidates("Serial ABCXYZ")).toEqual([]);
    expect(extractImeiCandidates("")).toEqual([]);
  });
});
