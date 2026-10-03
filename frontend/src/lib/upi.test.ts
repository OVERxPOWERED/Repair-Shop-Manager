import { describe, expect, it } from "vitest";
import { buildUpiUri } from "./upi";

describe("buildUpiUri", () => {
  it("builds a valid upi deep link with paise formatted to rupees", () => {
    const uri = buildUpiUri({
      vpa: "shop@okaxis",
      payeeName: "Quick Fix Repairs",
      amountPaise: 129950,
      note: "Job #1024 Balance",
    });

    expect(uri.startsWith("upi://pay?")).toBe(true);
    const url = new URL(uri);
    expect(url.searchParams.get("pa")).toBe("shop@okaxis");
    expect(url.searchParams.get("pn")).toBe("Quick Fix Repairs");
    expect(url.searchParams.get("am")).toBe("1299.50");
    expect(url.searchParams.get("cu")).toBe("INR");
    expect(url.searchParams.get("tn")).toBe("Job #1024 Balance");
  });

  it("truncates payee name and note to 50 characters and encodes special characters", () => {
    const longName = "A".repeat(60);
    const longNote = "Job & Repairs @ Special #100 / Discount % test ".repeat(2);
    const uri = buildUpiUri({
      vpa: "test.merchant@upi",
      payeeName: longName,
      amountPaise: 10000,
      note: longNote,
    });

    const url = new URL(uri);
    expect(url.searchParams.get("pn")?.length).toBeLessThanOrEqual(50);
    expect(url.searchParams.get("tn")?.length).toBeLessThanOrEqual(50);
    expect(url.searchParams.get("am")).toBe("100.00");
  });
});
