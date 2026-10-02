import { describe, it, expect } from "vitest";
import { validateUpiId, isValidUpiId } from "./upi";

describe("UPI ID validation", () => {
  it("accepts valid UPI IDs", () => {
    expect(validateUpiId("shopname@okaxis")).toBe("shopname@okaxis");
    expect(validateUpiId("9876543210@paytm")).toBe("9876543210@paytm");
    expect(validateUpiId("repair.pro-99@okhdfcbank")).toBe("repair.pro-99@okhdfcbank");
    expect(isValidUpiId("shop@icici")).toBe(true);
  });

  it("accepts empty or null string as optional", () => {
    expect(validateUpiId("")).toBe("");
    expect(isValidUpiId("")).toBe(true);
  });

  it("rejects invalid UPI IDs", () => {
    expect(() => validateUpiId("@axis")).toThrow("UPI ID looks wrong");
    expect(() => validateUpiId("shopname@")).toThrow("UPI ID looks wrong");
    expect(() => validateUpiId("a@b")).toThrow("UPI ID looks wrong");
    expect(() => validateUpiId("shopname@123")).toThrow("UPI ID looks wrong");
    expect(isValidUpiId("@axis")).toBe(false);
    expect(isValidUpiId("invalid_upi")).toBe(false);
  });
});
