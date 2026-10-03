import { describe, expect, it } from "vitest";
import { fitWithin } from "./compress";

describe("fitWithin", () => {
  it("leaves dimensions unchanged if already within maxSide", () => {
    const result = fitWithin(800, 600, 1600);
    expect(result).toEqual({ width: 800, height: 600 });
  });

  it("scales down landscape dimensions proportionally", () => {
    const result = fitWithin(3200, 1600, 1600);
    expect(result).toEqual({ width: 1600, height: 800 });
  });

  it("scales down portrait dimensions proportionally", () => {
    const result = fitWithin(1200, 2400, 1600);
    expect(result).toEqual({ width: 800, height: 1600 });
  });

  it("preserves exact boundaries when one side matches maxSide", () => {
    const result = fitWithin(1600, 1200, 1600);
    expect(result).toEqual({ width: 1600, height: 1200 });
  });

  it("handles exact square larger than maxSide", () => {
    const result = fitWithin(2400, 2400, 1600);
    expect(result).toEqual({ width: 1600, height: 1600 });
  });

  it("handles zero and negative dimensions safely", () => {
    expect(fitWithin(0, 500, 1600)).toEqual({ width: 0, height: 0 });
    expect(fitWithin(500, 0, 1600)).toEqual({ width: 0, height: 0 });
    expect(fitWithin(-10, 500, 1600)).toEqual({ width: 0, height: 0 });
    expect(fitWithin(800, 600, 0)).toEqual({ width: 0, height: 0 });
  });

  it("maintains aspect ratio closely", () => {
    const originalRatio = 1920 / 1080;
    const result = fitWithin(1920, 1080, 1600);
    expect(result.width).toBe(1600);
    expect(result.height).toBe(900);
    const newRatio = result.width / result.height;
    expect(Math.abs(originalRatio - newRatio)).toBeLessThan(0.01);
  });
});
