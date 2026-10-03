import { describe, expect, it } from "vitest";

import {
  buildInvoiceSharedMessage,
  buildJobReceivedMessage,
  buildReadyForPickupMessage,
  isPhoneMasked,
  normalizeLocale,
} from "./whatsapp";

describe("WhatsApp Message Builders", () => {
  const jobData = {
    customerName: "Rahul Sharma",
    shopName: "Apex Electronics",
    jobNo: 1042,
    deviceName: "Pixel 7 Pro",
    balancePaise: 150000,
    trackingUrl: "https://track.fixpro.in/t/abc-token-123/",
  };

  const invoiceData = {
    customerName: "Rahul Sharma",
    shopName: "Apex Electronics",
    invoiceNo: "INV/26-27/00001",
    totalPaise: 450000,
    balancePaise: 150000,
    trackingUrl: "https://track.fixpro.in/t/abc-token-123/",
  };

  describe("normalizeLocale", () => {
    it("preserves valid locales", () => {
      expect(normalizeLocale("en")).toBe("en");
      expect(normalizeLocale("hi")).toBe("hi");
      expect(normalizeLocale("hi-Latn")).toBe("hi-Latn");
    });

    it("falls back to 'en' for invalid or null locales", () => {
      expect(normalizeLocale(null)).toBe("en");
      expect(normalizeLocale("")).toBe("en");
      expect(normalizeLocale("fr")).toBe("en");
      expect(normalizeLocale("de")).toBe("en");
    });
  });

  describe("isPhoneMasked", () => {
    it("identifies masked and unmasked phone numbers correctly", () => {
      expect(isPhoneMasked("+91XXXXXX3210")).toBe(true);
      expect(isPhoneMasked("+91****3210")).toBe(true);
      expect(isPhoneMasked("")).toBe(true);
      expect(isPhoneMasked(null)).toBe(true);
      expect(isPhoneMasked(undefined)).toBe(true);
      expect(isPhoneMasked("+919876543210")).toBe(false);
      expect(isPhoneMasked("9876543210")).toBe(false);
    });
  });

  describe("buildJobReceivedMessage", () => {
    it("builds English message correctly", () => {
      const msg = buildJobReceivedMessage(jobData, "en");
      expect(msg).toContain("Hello Rahul Sharma");
      expect(msg).toContain("Pixel 7 Pro");
      expect(msg).toContain("Apex Electronics");
      expect(msg).toContain("Job #1042");
      expect(msg).toContain("https://track.fixpro.in/t/abc-token-123/");
    });

    it("builds Hindi message correctly", () => {
      const msg = buildJobReceivedMessage(jobData, "hi");
      expect(msg).toContain("नमस्ते Rahul Sharma");
      expect(msg).toContain("Pixel 7 Pro");
      expect(msg).toContain("Apex Electronics");
      expect(msg).toContain("जॉब #1042");
      expect(msg).toContain("https://track.fixpro.in/t/abc-token-123/");
    });

    it("builds Hinglish (hi-Latn) message correctly", () => {
      const msg = buildJobReceivedMessage(jobData, "hi-Latn");
      expect(msg).toContain("Namaste Rahul Sharma");
      expect(msg).toContain("Pixel 7 Pro");
      expect(msg).toContain("Apex Electronics");
      expect(msg).toContain("Job #1042");
      expect(msg).toContain("https://track.fixpro.in/t/abc-token-123/");
    });

    it("handles missing customer and device names gracefully", () => {
      const msg = buildJobReceivedMessage({
        shopName: "FixPro Shop",
        jobNo: 101,
      });
      expect(msg).toContain("Customer");
      expect(msg).toContain("device");
      expect(msg).toContain("FixPro Shop");
    });
  });

  describe("buildReadyForPickupMessage", () => {
    it("builds English message with balance due", () => {
      const msg = buildReadyForPickupMessage(jobData, "en");
      expect(msg).toContain("Hello Rahul Sharma");
      expect(msg).toContain("ready for pickup");
      expect(msg).toContain("Apex Electronics");
      expect(msg).toContain("Job #1042");
      expect(msg).toContain("₹1,500.00");
      expect(msg).toContain("https://track.fixpro.in/t/abc-token-123/");
    });

    it("builds Hindi message with balance due", () => {
      const msg = buildReadyForPickupMessage(jobData, "hi");
      expect(msg).toContain("नमस्ते Rahul Sharma");
      expect(msg).toContain("पिकअप के लिए तैयार है");
      expect(msg).toContain("₹1,500.00");
    });

    it("builds Hinglish message with balance due", () => {
      const msg = buildReadyForPickupMessage(jobData, "hi-Latn");
      expect(msg).toContain("Namaste Rahul Sharma");
      expect(msg).toContain("pickup ke liye ready hai");
      expect(msg).toContain("Balance due: ₹1,500.00");
    });
  });

  describe("buildInvoiceSharedMessage", () => {
    it("builds English invoice message", () => {
      const msg = buildInvoiceSharedMessage(invoiceData, "en");
      expect(msg).toContain("Hello Rahul Sharma");
      expect(msg).toContain("INV/26-27/00001");
      expect(msg).toContain("₹4,500.00");
      expect(msg).toContain("₹1,500.00");
      expect(msg).toContain("Apex Electronics");
      expect(msg).toContain("Track repair: https://track.fixpro.in/t/abc-token-123/");
    });

    it("builds Hindi invoice message", () => {
      const msg = buildInvoiceSharedMessage(invoiceData, "hi");
      expect(msg).toContain("नमस्ते Rahul Sharma");
      expect(msg).toContain("INV/26-27/00001");
      expect(msg).toContain("₹4,500.00");
      expect(msg).toContain("Apex Electronics");
      expect(msg).toContain("धन्यवाद");
    });

    it("builds Hinglish invoice message", () => {
      const msg = buildInvoiceSharedMessage(invoiceData, "hi-Latn");
      expect(msg).toContain("Namaste Rahul Sharma");
      expect(msg).toContain("INV/26-27/00001");
      expect(msg).toContain("₹4,500.00");
      expect(msg).toContain("dhanyavaad");
    });
  });
});
