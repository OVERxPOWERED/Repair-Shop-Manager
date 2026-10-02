import { describe, it, expect } from "vitest";
import { isValidIMEI, calculateIMEICheckDigit, formatIMEI } from "./imei";

describe("IMEI Luhn Algorithm & Validation (Week 2 Spike B)", () => {
  it("validates mathematically valid 15-digit IMEIs", () => {
    expect(isValidIMEI("864501041234560")).toBe(true);
    expect(isValidIMEI("352099001761481")).toBe(true);
    expect(isValidIMEI("990000862471853")).toBe(true);
    expect(isValidIMEI("864501-04-123456-0")).toBe(true);
    expect(isValidIMEI("864501 04 123456 0")).toBe(true);
  });

  it("rejects invalid IMEI check digits", () => {
    expect(isValidIMEI("864501041234567")).toBe(false);
    expect(isValidIMEI("352099001761488")).toBe(false);
  });

  it("rejects non-15 digit strings", () => {
    expect(isValidIMEI("1234567890")).toBe(false);
    expect(isValidIMEI("1234567890123456")).toBe(false);
    expect(isValidIMEI("abcdefghijklmno")).toBe(false);
  });

  it("calculates correct check digit for 14-digit prefix", () => {
    expect(calculateIMEICheckDigit("86450104123456")).toBe(0);
    expect(calculateIMEICheckDigit("35209900176148")).toBe(1);
    expect(calculateIMEICheckDigit("99000086247185")).toBe(3);
  });

  it("formats 15-digit IMEI for readable display", () => {
    expect(formatIMEI("864501041234560")).toBe("864501 04 123456 0");
  });
});
