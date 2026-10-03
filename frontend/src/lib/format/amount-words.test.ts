import { describe, expect, it } from "vitest";
import { amountInWords, integerToIndianWords } from "./amount-words";

describe("integerToIndianWords", () => {
  it("converts basic units and tens", () => {
    expect(integerToIndianWords(0)).toBe("Zero");
    expect(integerToIndianWords(1)).toBe("One");
    expect(integerToIndianWords(15)).toBe("Fifteen");
    expect(integerToIndianWords(20)).toBe("Twenty");
    expect(integerToIndianWords(42)).toBe("Forty Two");
    expect(integerToIndianWords(99)).toBe("Ninety Nine");
  });

  it("converts hundreds and thousands", () => {
    expect(integerToIndianWords(100)).toBe("One Hundred");
    expect(integerToIndianWords(105)).toBe("One Hundred Five");
    expect(integerToIndianWords(350)).toBe("Three Hundred Fifty");
    expect(integerToIndianWords(1000)).toBe("One Thousand");
    expect(integerToIndianWords(1299)).toBe("One Thousand Two Hundred Ninety Nine");
    expect(integerToIndianWords(15000)).toBe("Fifteen Thousand");
    expect(integerToIndianWords(99999)).toBe("Ninety Nine Thousand Nine Hundred Ninety Nine");
  });

  it("converts lakhs and crores", () => {
    expect(integerToIndianWords(100000)).toBe("One Lakh");
    expect(integerToIndianWords(2500000)).toBe("Twenty Five Lakh");
    expect(integerToIndianWords(10000000)).toBe("One Crore");
    expect(integerToIndianWords(10500050)).toBe("One Crore Five Lakh Fifty");
    expect(integerToIndianWords(12345678)).toBe(
      "One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight"
    );
  });
});

describe("amountInWords", () => {
  it("formats zero amount", () => {
    expect(amountInWords(0)).toBe("Zero Rupees Only");
  });

  it("matches the roadmap example", () => {
    expect(amountInWords(129950)).toBe(
      "Rupees One Thousand Two Hundred Ninety Nine and Fifty Paise Only"
    );
  });

  it("formats whole rupees without paise", () => {
    expect(amountInWords(100000)).toBe("Rupees One Thousand Only");
    expect(amountInWords(100)).toBe("Rupee One Only");
    expect(amountInWords(50000)).toBe("Rupees Five Hundred Only");
    expect(amountInWords(350000)).toBe("Rupees Three Thousand Five Hundred Only");
  });

  it("formats single paisa and paise", () => {
    expect(amountInWords(1)).toBe("One Paisa Only");
    expect(amountInWords(50)).toBe("Fifty Paise Only");
    expect(amountInWords(101)).toBe("Rupee One and One Paisa Only");
    expect(amountInWords(50025)).toBe("Rupees Five Hundred and Twenty Five Paise Only");
  });

  it("handles negative amounts", () => {
    expect(amountInWords(-150000)).toBe("Minus Rupees One Thousand Five Hundred Only");
  });
});
