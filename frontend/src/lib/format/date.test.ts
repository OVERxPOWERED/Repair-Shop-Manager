import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, todayIst } from "./date";

describe("Date formatters (IST timezone & Locale)", () => {
  const sampleIso = "2026-10-02T10:30:00.000Z"; // 4:00 PM IST (+5:30)

  it("formats date in en locale with IST timeZone", () => {
    const formatted = formatDate(sampleIso, "en");
    expect(formatted).toContain("2026");
    expect(formatted).toContain("Oct");
    expect(formatted).toContain("2");
  });

  it("formats date in hi locale", () => {
    const formatted = formatDate(sampleIso, "hi");
    expect(formatted).toContain("2026");
    expect(formatted).toContain("2");
  });

  it("formats date and time in IST", () => {
    const formatted = formatDateTime(sampleIso, "en");
    expect(formatted).toContain("4:00");
    expect(formatted).toContain("pm");
  });

  it("returns today in IST as YYYY-MM-DD", () => {
    const today = todayIst();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
