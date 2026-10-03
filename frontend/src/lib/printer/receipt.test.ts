import { describe, expect, it } from "vitest";

import {
  jobReceiptModel,
  paymentReceiptModel,
  invoiceReceiptModel,
  testReceiptModel,
} from "./receipt";
import { chunkBytes, canvasToEscPosRaster } from "./rasterizer";
import { FakePrinterService } from "@/native/printer/fake-printer";
import type { Job } from "@/features/jobs/api";
import type { Invoice } from "@/features/invoices/api";
import type { Payment } from "@/features/billing/api";

describe("Receipt Models & Builders", () => {
  const mockShop = {
    name: "FixPro Electronics",
    phone: "9876543210",
    address_line1: "Shop 12, Station Road",
    city: "Mumbai",
    pincode: "400001",
    gstin: "27ABCDE1234F1Z5",
    upi_id: "fixpro@okaxis",
  };

  const mockJob: Job = {
    id: "job-101-uuid",
    job_no: 1042,
    kind: "full",
    customer: {
      id: "cust-1",
      name: "Rajesh Kumar",
      phone: "+919876543210",
      phone_masked: false,
    },
    device: {
      id: "dev-1",
      category: "mobile",
      brand_name: "OnePlus",
      model: "9 Pro",
      color: "Stellar Black",
      identifiers: [
        { type: "imei1", value: "867823049182341", is_valid_luhn: true },
        { type: "serial", value: "SN9872134" },
      ],
    },
    assigned_to: { id: "tech-1", display_name: "Amit Technician" },
    status: "in_repair",
    priority: "normal",
    source: "walk_in",
    fault_description: "Display glass cracked, touch working",
    device_condition: "Minor scratches on bezel",
    condition_tags: ["scratched_screen", "dented_corner"],
    lock_type: "pin",
    is_locked: false,
    estimate_paise: 450000,
    paid_paise: 100000,
    balance_paise: 350000,
    tracking_token: "track-tok-rajesh-1042",
    tracking_url: "https://track.fixpro.in/t/track-tok-rajesh-1042/",
    expected_date: "2026-10-06T18:00:00Z",
    delivered_at: null,
    cancelled_at: null,
    reopened_at: null,
    version: 1,
    created_at: "2026-10-03T10:30:00Z",
    updated_at: "2026-10-03T10:30:00Z",
    accessories: [{ id: "acc-1", name: "SIM Tray" }, { id: "acc-2", name: "Back Cover" }],
  };

  describe("jobReceiptModel", () => {
    it("builds a comprehensive intake receipt model", () => {
      const model = jobReceiptModel(mockJob, mockShop);

      expect(model.title).toBe("REPAIR INTAKE RECEIPT");
      expect(model.header.shopName).toBe("FixPro Electronics");
      expect(model.header.documentNumber).toBe("Job #1042");
      expect(model.header.customerName).toBe("Rajesh Kumar");
      expect(model.header.customerPhone).toBe("+919876543210");

      const textDump = JSON.stringify(model.lines);
      expect(textDump).toContain("OnePlus 9 Pro");
      expect(textDump).toContain("867823049182341");
      expect(textDump).toContain("Display glass cracked");
      expect(textDump).toContain("SIM Tray");
      expect(textDump).toContain("₹4,500.00");
      expect(textDump).toContain("₹1,000.00");
      expect(textDump).toContain("₹3,500.00");

      expect(model.qr?.data).toBe("https://track.fixpro.in/t/track-tok-rajesh-1042/");
    });

    it("STRICT SECURITY: never includes lock values (PIN/pattern/password)", () => {
      const model = jobReceiptModel(mockJob, mockShop);
      const allText = JSON.stringify(model);

      expect(allText.toLowerCase()).not.toContain("lock_value");
      expect(allText.toLowerCase()).not.toContain("secret");
      expect(allText.toLowerCase()).not.toContain("pattern");
    });
  });

  describe("paymentReceiptModel", () => {
    it("builds payment slip with UTR, payment mode, and remaining balance", () => {
      const mockPayment: Payment = {
        id: "pay-7788-uuid",
        job_id: "job-1042-uuid",
        customer_id: "cust-1",
        direction: "in",
        amount_paise: 200000,
        mode: "upi",
        reference: "UPI/1234567890/HDFC",
        received_by_id: "user-1",
        received_at: "2026-10-03T11:00:00Z",
        created_at: "2026-10-03T11:00:00Z",
        notes: "Part advance",
      };

      const model = paymentReceiptModel(
        { job_no: 1042, device: { brand_name: "OnePlus", model: "9 Pro" } },
        mockPayment,
        mockShop,
        150000,
      );

      expect(model.title).toBe("PAYMENT RECEIPT");
      expect(model.header.documentNumber).toBe("REC-PAY-7788");
      const textDump = JSON.stringify(model.lines);
      expect(textDump).toContain("Job #1042");
      expect(textDump).toContain("UPI");
      expect(textDump).toContain("UPI/1234567890/HDFC");
      expect(textDump).toContain("₹2,000.00");
      expect(textDump).toContain("₹1,500.00");
    });
  });

  describe("invoiceReceiptModel", () => {
    it("builds itemized invoice receipt with GST breakdown and UPI QR", () => {
      const mockInvoice: Invoice = {
        id: "inv-99-uuid",
        job_id: "job-101-uuid",
        customer_id: "cust-1",
        kind: "tax_invoice",
        status: "issued",
        series_id: "series-1",
        number: 45,
        number_display: "INV-2026-0045",
        issue_date: "2026-10-03",
        original_invoice_id: null,
        place_of_supply_state: "27",
        customer_gstin: "",
        subtotal_paise: 500000,
        discount_paise: 50000,
        taxable_paise: 450000,
        cgst_paise: 40500,
        sgst_paise: 40500,
        igst_paise: 0,
        round_off_paise: 0,
        total_paise: 531000,
        amount_paid_paise: 200000,
        balance_paise: 331000,
        shop_snapshot: {
          name: "FixPro Electronics",
          upi_id: "fixpro@okaxis",
        },
        customer_snapshot: {
          name: "Rajesh Kumar",
          phone: "9876543210",
        },
        pdf_key: "shops/1/invoices/inv-99-a4.pdf",
        notes: "",
        terms: "",
        issued_by_id: "user-1",
        issued_at: "2026-10-03T11:00:00Z",
        cancelled_at: null,
        cancel_reason: "",
        lines: [
          {
            id: "line-1",
            position: 1,
            description: "AMOLED Screen Assembly",
            hsn_sac: "85177090",
            quantity: 1,
            unit_price_paise: 500000,
            discount_paise: 50000,
            tax_inclusive: false,
            tax_rate_bp: 1800,
            taxable_paise: 450000,
            cgst_paise: 40500,
            sgst_paise: 40500,
            igst_paise: 0,
            line_total_paise: 531000,
          },
        ],
        version: 1,
        created_at: "2026-10-03T10:00:00Z",
        updated_at: "2026-10-03T11:00:00Z",
      };

      const model = invoiceReceiptModel(mockInvoice, mockShop);

      expect(model.title).toBe("TAX INVOICE");
      expect(model.header.documentNumber).toBe("INV-2026-0045");
      const textDump = JSON.stringify(model.lines);
      expect(textDump).toContain("AMOLED Screen Assembly");
      expect(textDump).toContain("₹5,310.00");
      expect(textDump).toContain("₹405.00"); // CGST
      expect(textDump).toContain("₹3,310.00"); // Balance

      expect(model.qr?.data).toContain("upi://pay");
      expect(model.qr?.data).toContain("pa=fixpro%40okaxis");
      expect(model.qr?.data).toContain("am=3310.00");
    });
  });

  describe("testReceiptModel", () => {
    it("builds bilingual test receipt with English and Hindi Devanagari text", () => {
      const model = testReceiptModel(mockShop);
      const text = JSON.stringify(model);

      expect(text).toContain("फिक्सप्रो थर्मल प्रिंटर टेस्ट");
      expect(text).toContain("Noto Sans Hindi");
      expect(text).toContain("1-Bit Monochrome");
    });
  });
});

describe("chunkBytes", () => {
  it("splits bytes accurately into fixed MTU chunk sizes", () => {
    const input = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const chunks = chunkBytes(input, 4);

    expect(chunks.length).toBe(3);
    expect(Array.from(chunks[0])).toEqual([1, 2, 3, 4]);
    expect(Array.from(chunks[1])).toEqual([5, 6, 7, 8]);
    expect(Array.from(chunks[2])).toEqual([9, 10]);
  });

  it("throws on invalid chunk size <= 0", () => {
    expect(() => chunkBytes(new Uint8Array([1, 2]), 0)).toThrow();
  });
});

describe("FakePrinterService & Raster Cut Protocol", () => {
  it("records transmitted bytes starting with ESC @ (0x1b 0x40) and ending with cut command when cut is true", async () => {
    const fakePrinter = new FakePrinterService();
    await fakePrinter.connect("mock-ble-01");
    expect(fakePrinter.isConnected()).toBe(true);

    const width = 16;
    const height = 4;
    const data = new Uint8Array(width * height * 4);
    data.fill(255);

    const rasterBytesWithCut = canvasToEscPosRaster(
      { width, height, data },
      { cut: true },
    );

    await fakePrinter.write(rasterBytesWithCut);

    const written = fakePrinter.getCombinedWrittenBytes();

    // 1. Starts with ESC @ (0x1b, 0x40)
    expect(written[0]).toBe(0x1b);
    expect(written[1]).toBe(0x40);

    // 2. Ends with GS V 1 (0x1d, 0x56, 0x01)
    const len = written.length;
    expect(written[len - 3]).toBe(0x1d);
    expect(written[len - 2]).toBe(0x56);
    expect(written[len - 1]).toBe(0x01);

    await fakePrinter.disconnect();
    expect(fakePrinter.isConnected()).toBe(false);
  });

  it("does not append cut command when cut is false", async () => {
    const fakePrinter = new FakePrinterService();
    await fakePrinter.connect("mock-ble-01");

    const width = 16;
    const height = 4;
    const data = new Uint8Array(width * height * 4);
    data.fill(255);

    const rasterBytesNoCut = canvasToEscPosRaster(
      { width, height, data },
      { cut: false },
    );

    await fakePrinter.write(rasterBytesNoCut);

    const written = fakePrinter.getCombinedWrittenBytes();
    const len = written.length;

    // Ends with 0x0a 0x0a 0x0a (feed lines only), not 0x1d 0x56 0x01
    expect(written[len - 1]).toBe(0x0a);
  });
});
