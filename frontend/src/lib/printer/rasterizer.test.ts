import { describe, expect, it } from "vitest";
import {
  canvasToEscPosRaster,
  chunkBytes,
  RasterSource,
} from "./rasterizer";

describe("ESC/POS Rasterizer", () => {
  it("a 16×2 image with the first pixel black → the first band's first data byte is 0b10000000", () => {
    const width = 16;
    const height = 2;
    const data = new Uint8Array(width * height * 4);
    // Fill all with opaque white
    data.fill(255);
    // Set first pixel (0, 0) to opaque black
    data[0] = 0;
    data[1] = 0;
    data[2] = 0;
    data[3] = 255;

    const source: RasterSource = { width, height, data };
    const raster = canvasToEscPosRaster(source);

    // Prefix is ESC @ (2 bytes: 0x1b, 0x40)
    expect(raster[0]).toBe(0x1b);
    expect(raster[1]).toBe(0x40);

    // First band GS v 0 header (8 bytes: 0x1d, 0x76, 0x30, 0x00, xL, xH, yL, yH)
    expect(raster[2]).toBe(0x1d);
    expect(raster[3]).toBe(0x76);
    expect(raster[4]).toBe(0x30);
    expect(raster[5]).toBe(0x00);

    // First data byte of the first band is at offset 2 + 8 = 10
    expect(raster[10]).toBe(0b10000000);
    // Second byte (pixels 8-15) is all white (0)
    expect(raster[11]).toBe(0);
  });

  it("a 384×300 image → three GS v 0 headers (0x1d 0x76 0x30), for 128 + 128 + 44 rows", () => {
    const width = 384;
    const height = 300;
    const data = new Uint8Array(width * height * 4);
    data.fill(255);

    const source: RasterSource = { width, height, data };
    const raster = canvasToEscPosRaster(source);

    // Scan for GS v 0 headers: 0x1d 0x76 0x30 0x00
    const headers: { offset: number; rows: number }[] = [];
    for (let i = 0; i < raster.length - 8; i++) {
      if (
        raster[i] === 0x1d &&
        raster[i + 1] === 0x76 &&
        raster[i + 2] === 0x30 &&
        raster[i + 3] === 0x00
      ) {
        const yL = raster[i + 6];
        const yH = raster[i + 7];
        const rows = yL + yH * 256;
        headers.push({ offset: i, rows });
      }
    }

    expect(headers).toHaveLength(3);
    expect(headers[0].rows).toBe(128);
    expect(headers[1].rows).toBe(128);
    expect(headers[2].rows).toBe(44);
    expect(headers[0].rows + headers[1].rows + headers[2].rows).toBe(300);
  });

  it("a transparent pixel is treated as white", () => {
    // 1x1 image with transparent pixel (alpha = 0, RGB = 0)
    const sourceTransparent: RasterSource = {
      width: 1,
      height: 1,
      data: new Uint8Array([0, 0, 0, 0]),
    };
    const rasterTransparent = canvasToEscPosRaster(sourceTransparent);
    // Data byte at offset 10 should be 0 (white, no dot printed)
    expect(rasterTransparent[10]).toBe(0);

    // Contrast with opaque black pixel (alpha = 255, RGB = 0)
    const sourceOpaqueBlack: RasterSource = {
      width: 1,
      height: 1,
      data: new Uint8Array([0, 0, 0, 255]),
    };
    const rasterOpaqueBlack = canvasToEscPosRaster(sourceOpaqueBlack);
    // First pixel black is bit 7 set (0b10000000 = 128)
    expect(rasterOpaqueBlack[10]).toBe(0b10000000);
  });

  it("chunkBytes of 45 bytes with size 20 → lengths [20, 20, 5]", () => {
    const bytes = new Uint8Array(45);
    const chunks = chunkBytes(bytes, 20);
    expect(chunks.map((c) => c.length)).toEqual([20, 20, 5]);
  });
});
