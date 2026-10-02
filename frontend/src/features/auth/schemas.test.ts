import { describe, it, expect } from "vitest";
import { phoneSchema, otpSchema, profileSchema } from "./schemas";

describe("Auth schemas", () => {
  describe("phoneSchema", () => {
    it("accepts valid 10-digit Indian phone numbers starting with 6, 7, 8, 9", () => {
      expect(phoneSchema.safeParse({ phone: "9876543210" }).success).toBe(true);
      expect(phoneSchema.safeParse({ phone: "8123456789" }).success).toBe(true);
      expect(phoneSchema.safeParse({ phone: "7000000000" }).success).toBe(true);
      expect(phoneSchema.safeParse({ phone: "6999999999" }).success).toBe(true);
    });

    it("rejects phone numbers with fewer than 10 digits or invalid starting digit", () => {
      expect(phoneSchema.safeParse({ phone: "5999999999" }).success).toBe(false);
      expect(phoneSchema.safeParse({ phone: "987654321" }).success).toBe(false);
      expect(phoneSchema.safeParse({ phone: "98765432100" }).success).toBe(false);
      expect(phoneSchema.safeParse({ phone: "abcdefghij" }).success).toBe(false);
      expect(phoneSchema.safeParse({ phone: "+919876543210" }).success).toBe(false);
    });
  });

  describe("otpSchema", () => {
    it("accepts exactly 6 digits", () => {
      expect(otpSchema.safeParse({ code: "123456" }).success).toBe(true);
      expect(otpSchema.safeParse({ code: "000000" }).success).toBe(true);
    });

    it("rejects invalid lengths and non-digits", () => {
      expect(otpSchema.safeParse({ code: "12345" }).success).toBe(false);
      expect(otpSchema.safeParse({ code: "1234567" }).success).toBe(false);
      expect(otpSchema.safeParse({ code: "12345a" }).success).toBe(false);
      expect(otpSchema.safeParse({ code: "" }).success).toBe(false);
    });
  });

  describe("profileSchema", () => {
    it("accepts valid names and emails", () => {
      expect(
        profileSchema.safeParse({
          name: "Ramesh Kumar",
          email: "ramesh@example.com",
          preferred_locale: "hi",
        }).success
      ).toBe(true);

      expect(
        profileSchema.safeParse({
          name: "Amit",
          email: "",
          preferred_locale: "en",
        }).success
      ).toBe(true);

      expect(
        profileSchema.safeParse({
          name: "Amit",
          email: null,
          preferred_locale: "hi-Latn",
        }).success
      ).toBe(true);
    });

    it("rejects names shorter than 2 or longer than 120 chars", () => {
      expect(profileSchema.safeParse({ name: "A" }).success).toBe(false);
      expect(profileSchema.safeParse({ name: "x".repeat(121) }).success).toBe(false);
    });

    it("rejects invalid email formats", () => {
      expect(profileSchema.safeParse({ name: "Ramesh", email: "not-an-email" }).success).toBe(false);
    });
  });
});
