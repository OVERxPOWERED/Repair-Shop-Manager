import { describe, it, expect } from "vitest";
import { validateGstin, isValidGstin } from "./gstin";

describe("GSTIN validation", () => {
  it("accepts valid GSTINs and normalizes them to uppercase", () => {
    expect(validateGstin("27AAPFU0939F1ZV")).toBe("27AAPFU0939F1ZV");
    expect(validateGstin("29ABCDE1234F1ZW")).toBe("29ABCDE1234F1ZW");
    expect(validateGstin(" 27aapfu0939f1zv ")).toBe("27AAPFU0939F1ZV");
    expect(isValidGstin("27AAPFU0939F1ZV")).toBe(true);
    expect(isValidGstin("29ABCDE1234F1ZW")).toBe(true);
  });

  it("rejects invalid check character: 29ABCDE1234F1Z5", () => {
    expect(() => validateGstin("29ABCDE1234F1Z5")).toThrow(
      "GSTIN check character is wrong. Please re-check the number."
    );
    expect(isValidGstin("29ABCDE1234F1Z5")).toBe(false);
  });

  it("rejects invalid format and short strings", () => {
    expect(() => validateGstin("SHORT")).toThrow(
      "GSTIN must be 15 characters, like 27AAPFU0939F1ZV."
    );
    expect(() => validateGstin("")).toThrow(
      "GSTIN must be 15 characters, like 27AAPFU0939F1ZV."
    );
    expect(isValidGstin("12345")).toBe(false);
  });

  it("rejects unknown state code: 99AAPFU0939F1ZV", () => {
    expect(() => validateGstin("99AAPFU0939F1ZV")).toThrow(
      "GSTIN starts with an unknown state code."
    );
    expect(isValidGstin("99AAPFU0939F1ZV")).toBe(false);
  });
});
