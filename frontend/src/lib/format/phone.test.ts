import { describe, expect, it } from "vitest";
import { formatPhone, toWhatsAppDigits } from "./phone";

describe("Phone formatters (Indian E.164 & WhatsApp)", () => {
  it("formats +91 numbers into spaced grouping", () => {
    expect(formatPhone("+919876543210")).toBe("+91 98765 43210");
  });

  it("leaves non-+91 numbers unchanged", () => {
    expect(formatPhone("+14155552671")).toBe("+14155552671");
    expect(formatPhone("9876543210")).toBe("9876543210");
  });

  it("extracts digits for WhatsApp API URLs", () => {
    expect(toWhatsAppDigits("+919876543210")).toBe("919876543210");
    expect(toWhatsAppDigits("+91 98765 43210")).toBe("919876543210");
  });
});
