import { describe, it, expect } from "vitest";
import { onboardingSchema } from "./schema";

describe("Onboarding schema", () => {
  it("accepts valid onboarding payload without GST", () => {
    const valid = {
      name: "Star Mobile Care",
      shop_type: "mobile",
      phone: "9876543210",
      address_line1: "Shop 12, Main Bazaar",
      city: "Indore",
      pincode: "452001",
      state_code: "23",
      gst_enabled: false,
      gstin: "",
      upi_id: "starmobile@okaxis",
    };
    expect(onboardingSchema.safeParse(valid).success).toBe(true);
  });

  it("requires valid GSTIN and matching state code when GST is enabled", () => {
    const withGst = {
      name: "Star Mobile Care",
      shop_type: "mobile",
      phone: "9876543210",
      address_line1: "Shop 12, Main Bazaar",
      city: "Mumbai",
      pincode: "400001",
      state_code: "27",
      gst_enabled: true,
      gstin: "27AAPFU0939F1ZV",
      upi_id: "starmobile@okaxis",
    };
    expect(onboardingSchema.safeParse(withGst).success).toBe(true);

    // Fails when GSTIN is missing
    expect(
      onboardingSchema.safeParse({ ...withGst, gstin: "" }).success
    ).toBe(false);

    // Fails when GSTIN checksum is invalid
    expect(
      onboardingSchema.safeParse({ ...withGst, gstin: "29ABCDE1234F1Z5" }).success
    ).toBe(false);

    // Fails when state_code mismatches GSTIN
    expect(
      onboardingSchema.safeParse({ ...withGst, state_code: "29" }).success
    ).toBe(false);
  });

  it("rejects invalid shop type and empty name", () => {
    expect(
      onboardingSchema.safeParse({
        name: "",
        shop_type: "invalid_type",
        gst_enabled: false,
        gstin: "",
        state_code: "",
        upi_id: "",
      }).success
    ).toBe(false);
  });
});
