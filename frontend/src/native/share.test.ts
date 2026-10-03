import { describe, expect, it, vi } from "vitest";

import { blobToBase64, formatWhatsAppPhone, openWhatsApp } from "./share";

describe("Native Share & WhatsApp Helpers", () => {
  describe("formatWhatsAppPhone", () => {
    it("prepends '91' to 10-digit Indian phone numbers", () => {
      expect(formatWhatsAppPhone("9876543210")).toBe("919876543210");
    });

    it("handles E.164 phone numbers with +91 correctly", () => {
      expect(formatWhatsAppPhone("+919876543210")).toBe("919876543210");
    });

    it("cleans phone numbers with spaces, brackets, and dashes", () => {
      expect(formatWhatsAppPhone("+91 (987) 654-3210")).toBe("919876543210");
    });

    it("preserves non-10-digit international phone numbers", () => {
      expect(formatWhatsAppPhone("+15551234567")).toBe("15551234567");
    });
  });

  describe("blobToBase64", () => {
    it("converts a Blob into raw base64 string without data URI prefix", async () => {
      const blob = new Blob(["Hello FixPro PDF"], { type: "text/plain" });
      const b64 = await blobToBase64(blob);
      expect(b64).toBe(btoa("Hello FixPro PDF"));
      expect(b64.startsWith("data:")).toBe(false);
    });
  });

  describe("openWhatsApp", () => {
    it("opens wa.me URL with properly encoded text via window.open on web", async () => {
      const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

      await openWhatsApp("+919876543210", "Hello! Job #101 is ready.");

      expect(openSpy).toHaveBeenCalledWith(
        "https://wa.me/919876543210?text=Hello!%20Job%20%23101%20is%20ready.",
        "_blank",
        "noopener,noreferrer",
      );

      openSpy.mockRestore();
    });
  });
});
