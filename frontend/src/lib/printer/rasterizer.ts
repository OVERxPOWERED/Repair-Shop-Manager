/**
 * FixPro Thermal Printing Rasterizer (Spike 0.8)
 *
 * Converts Canvas / RGBA pixel arrays into 1-bit monochrome ESC/POS raster bitmaps.
 * Solves the critical Indian workshop requirement: Printing Hindi / Devanagari script
 * and dynamic UPI QR codes on thermal Bluetooth printers without corrupt font ROM chips.
 * Emits in bands of at most 128 rows to protect small printer buffers.
 */

export interface RasterSource {
  width: number;
  height: number;
  data: Uint8ClampedArray | Uint8Array;
}

export interface RasterOptions {
  width?: number; // Optional override for 58mm (384) or 80mm (576)
  dithering?: boolean;
  cut?: boolean; // Default true (partial auto-cut)
}

export const MAX_BAND_HEIGHT = 128;

/**
 * Splits a byte buffer into chunks of specified size (e.g. 20-byte BLE MTU packets).
 */
export function chunkBytes(bytes: Uint8Array, size: number): Uint8Array[] {
  if (size <= 0) {
    throw new Error("Chunk size must be greater than 0");
  }
  const chunks: Uint8Array[] = [];
  for (let i = 0; i < bytes.length; i += size) {
    chunks.push(bytes.subarray(i, Math.min(i + size, bytes.length)));
  }
  return chunks;
}

/**
 * Converts RasterSource (ImageData or custom pixel buffer) to 1-bit monochrome ESC/POS
 * raster bytes using 'GS v 0' command emitted in bands of at most 128 rows.
 */
export function canvasToEscPosRaster(source: RasterSource, options?: RasterOptions): Uint8Array {
  const { width, height, data } = source;
  const paddedWidth = Math.ceil(width / 8) * 8;
  const bytesPerLine = paddedWidth / 8;

  // Convert to grayscale luminance
  const grayscale = new Float32Array(paddedWidth * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < paddedWidth; x++) {
      const grayIdx = y * paddedWidth + x;
      if (x < width) {
        const srcIdx = (y * width + x) * 4;
        const r = data[srcIdx];
        const g = data[srcIdx + 1];
        const b = data[srcIdx + 2];
        const a = data[srcIdx + 3];

        // Standard sRGB luminance weighting. Alpha transparency blends with white.
        const alphaNorm = a / 255;
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) * alphaNorm + 255 * (1 - alphaNorm);
        grayscale[grayIdx] = lum;
      } else {
        // Pad with white pixels beyond source width
        grayscale[grayIdx] = 255;
      }
    }
  }

  // Apply Floyd-Steinberg Dithering for smooth photo/logo reproduction
  if (options?.dithering) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < paddedWidth; x++) {
        const idx = y * paddedWidth + x;
        const oldVal = grayscale[idx];
        const newVal = oldVal < 128 ? 0 : 255;
        grayscale[idx] = newVal;
        const err = oldVal - newVal;

        if (x + 1 < paddedWidth) grayscale[idx + 1] += (err * 7) / 16;
        if (y + 1 < height) {
          if (x - 1 >= 0) grayscale[(y + 1) * paddedWidth + (x - 1)] += (err * 3) / 16;
          grayscale[(y + 1) * paddedWidth + x] += (err * 5) / 16;
          if (x + 1 < paddedWidth) grayscale[(y + 1) * paddedWidth + (x + 1)] += (err * 1) / 16;
        }
      }
    }
  }

  // Pack 8 pixels per byte (1 = black dot, 0 = white paper)
  const rasterBytes = new Uint8Array(bytesPerLine * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < paddedWidth; x++) {
      const isBlack = grayscale[y * paddedWidth + x] < 128;
      if (isBlack) {
        const byteIndex = y * bytesPerLine + Math.floor(x / 8);
        const bitOffset = 7 - (x % 8);
        rasterBytes[byteIndex] |= 1 << bitOffset;
      }
    }
  }

  // Calculate bands
  const numBands = Math.ceil(height / MAX_BAND_HEIGHT);
  const prefix = new Uint8Array([0x1b, 0x40]); // ESC @: Initialize printer

  const shouldCut = options?.cut ?? true;
  const feed = [0x0a, 0x0a, 0x0a]; // Feed 3 lines
  const cutCmd = [0x1d, 0x56, 0x01]; // GS V 1: Partial cut
  const suffix = new Uint8Array(shouldCut ? [...feed, ...cutCmd] : feed);

  const xL = bytesPerLine % 256;
  const xH = Math.floor(bytesPerLine / 256);

  // Total buffer calculation: prefix + (8 bytes header per band + band bytes) + suffix
  const totalLength =
    prefix.length +
    numBands * 8 +
    rasterBytes.length +
    suffix.length;

  const commandStream = new Uint8Array(totalLength);
  let offset = 0;

  commandStream.set(prefix, offset);
  offset += prefix.length;

  for (let b = 0; b < numBands; b++) {
    const startRow = b * MAX_BAND_HEIGHT;
    const bandHeight = Math.min(MAX_BAND_HEIGHT, height - startRow);
    const bandRasterStart = startRow * bytesPerLine;
    const bandRasterLen = bandHeight * bytesPerLine;

    const yL = bandHeight % 256;
    const yH = Math.floor(bandHeight / 256);

    const bandHeader = new Uint8Array([
      0x1d, 0x76, 0x30, 0x00, // GS v 0 0: Print raster bit image
      xL, xH,
      yL, yH,
    ]);

    commandStream.set(bandHeader, offset);
    offset += bandHeader.length;

    commandStream.set(
      rasterBytes.subarray(bandRasterStart, bandRasterStart + bandRasterLen),
      offset
    );
    offset += bandRasterLen;
  }

  commandStream.set(suffix, offset);

  return commandStream;
}

/**
 * Creates an in-memory bilingual test receipt canvas matching Indian shop requirements.
 */
export function renderBilingualTestReceiptCanvas(width: number = 384): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not initialize canvas 2D context");

  canvas.width = width;
  canvas.height = 550; // Dynamic height based on content

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Shop Header (Bilingual Hindi + English)
  ctx.fillStyle = "#000000";
  ctx.textAlign = "center";
  ctx.font = "bold 20px sans-serif";
  ctx.fillText("एम सॉल्यूशन - मोबाइल रिपेयर", width / 2, 35);
  ctx.font = "14px sans-serif";
  ctx.fillText("M SOLUTION REPAIRS", width / 2, 58);
  ctx.font = "12px sans-serif";
  ctx.fillText("Shop No 4, Station Road, Mumbai", width / 2, 78);
  ctx.fillText("Ph: +91 98765 43210 | GSTIN: 27ABCDE1234F1Z5", width / 2, 96);

  // Divider
  ctx.beginPath();
  ctx.setLineDash([4, 4]);
  ctx.moveTo(10, 110);
  ctx.lineTo(width - 10, 110);
  ctx.stroke();
  ctx.setLineDash([]);

  // Job Details
  ctx.textAlign = "left";
  ctx.font = "bold 13px sans-serif";
  ctx.fillText("Job Sheet: #JOB-2026-0042", 15, 135);
  ctx.font = "12px sans-serif";
  ctx.fillText("Customer: राहुल शर्मा (Rahul Sharma)", 15, 155);
  ctx.fillText("Phone: +91 98*** **310", 15, 175);
  ctx.fillText("Device: Samsung Galaxy A52 (Black)", 15, 195);
  ctx.fillText("Problem: स्क्रीन टूटी हुई (Screen Replacement)", 15, 215);

  // Items table
  ctx.fillRect(10, 230, width - 20, 2);
  ctx.font = "bold 12px sans-serif";
  ctx.fillText("विवरण (Item)", 15, 250);
  ctx.textAlign = "right";
  ctx.fillText("राशि (Amount)", width - 15, 250);
  ctx.textAlign = "left";
  ctx.fillRect(10, 260, width - 20, 1);

  ctx.font = "12px sans-serif";
  ctx.fillText("OLED Screen Combo", 15, 280);
  ctx.textAlign = "right";
  ctx.fillText("₹3,500.00", width - 15, 280);

  ctx.textAlign = "left";
  ctx.fillText("Labour / Service Charge", 15, 305);
  ctx.textAlign = "right";
  ctx.fillText("₹600.00", width - 15, 305);

  // Totals
  ctx.fillRect(10, 320, width - 20, 1);
  ctx.font = "bold 13px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("कुल राशि (Total Due):", 15, 345);
  ctx.textAlign = "right";
  ctx.fillText("₹4,100.00", width - 15, 345);

  ctx.font = "12px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("Advance Paid (Cash):", 15, 370);
  ctx.textAlign = "right";
  ctx.fillText("₹1,000.00", width - 15, 370);

  ctx.font = "bold 14px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("बकाया (Balance):", 15, 400);
  ctx.textAlign = "right";
  ctx.fillText("₹3,100.00", width - 15, 400);

  // Footer notes & Tracking QR placeholder
  ctx.textAlign = "center";
  ctx.font = "italic 11px sans-serif";
  ctx.fillText("धन्यवाद! 30 Days Service Warranty", width / 2, 450);
  ctx.fillText("Track live status: fixpro.in/t/x9k2p", width / 2, 470);

  return canvas;
}
