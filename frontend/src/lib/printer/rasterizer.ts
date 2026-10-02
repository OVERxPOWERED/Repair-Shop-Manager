/**
 * FixPro Thermal Printing Rasterizer (Week 2 Spike A)
 * 
 * Converts HTML Canvas / RGBA pixel arrays into 1-bit monochrome ESC/POS raster bitmaps.
 * Solves the critical Indian workshop requirement: Printing Hindi / Devanagari script
 * and dynamic UPI QR codes on thermal Bluetooth printers without corrupt font ROM chips.
 */

export interface RasterOptions {
  width: number; // 384 px for 58mm paper, 576 px for 80mm paper
  dithering?: boolean;
}

/**
 * Converts ImageData to 1-bit monochrome ESC/POS raster bytes using 'GS v 0' command.
 * Command structure:
 * GS v 0 m xL xH yL yH d1...dk
 * 0x1D 0x76 0x30 0x00 (xL xH) (yL yH) [raster bytes]
 */
export function canvasToEscPosRaster(imageData: ImageData, options?: RasterOptions): Uint8Array {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;
  const bytesPerLine = Math.ceil(width / 8);

  // Convert to grayscale luminance
  const grayscale = new Float32Array(width * height);
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    // Standard sRGB luminance weighting. Alpha transparency blends with white.
    const alphaNorm = a / 255;
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) * alphaNorm + 255 * (1 - alphaNorm);
    grayscale[i / 4] = lum;
  }

  // Apply Floyd-Steinberg Dithering for smooth photo/logo reproduction
  if (options?.dithering) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const oldVal = grayscale[idx];
        const newVal = oldVal < 128 ? 0 : 255;
        grayscale[idx] = newVal;
        const err = oldVal - newVal;

        if (x + 1 < width) grayscale[idx + 1] += (err * 7) / 16;
        if (y + 1 < height) {
          if (x - 1 >= 0) grayscale[(y + 1) * width + (x - 1)] += (err * 3) / 16;
          grayscale[(y + 1) * width + x] += (err * 5) / 16;
          if (x + 1 < width) grayscale[(y + 1) * width + (x + 1)] += (err * 1) / 16;
        }
      }
    }
  }

  // Pack 8 pixels per byte (1 = black dot, 0 = white paper)
  const rasterBytes = new Uint8Array(bytesPerLine * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const isBlack = grayscale[y * width + x] < 128;
      if (isBlack) {
        const byteIndex = y * bytesPerLine + Math.floor(x / 8);
        const bitOffset = 7 - (x % 8);
        rasterBytes[byteIndex] |= 1 << bitOffset;
      }
    }
  }

  // Build ESC/POS raster header
  // xL = (width / 8) % 256, xH = (width / 8) / 256
  // yL = height % 256, yH = height / 256
  const xL = bytesPerLine % 256;
  const xH = Math.floor(bytesPerLine / 256);
  const yL = height % 256;
  const yH = Math.floor(height / 256);

  const header = new Uint8Array([
    0x1b, 0x40,             // ESC @: Initialize printer
    0x1b, 0x61, 0x01,       // ESC a 1: Center alignment
    0x1d, 0x76, 0x30, 0x00, // GS v 0 0: Print raster bit image (normal mode)
    xL, xH,
    yL, yH,
  ]);

  const footer = new Uint8Array([
    0x0a, 0x0a, 0x0a,       // Line feeds (advance paper past tear bar)
    0x1d, 0x56, 0x01,       // GS V 1: Partial cut (if hardware cutter present)
  ]);

  // Concatenate buffer
  const totalLength = header.length + rasterBytes.length + footer.length;
  const commandStream = new Uint8Array(totalLength);
  commandStream.set(header, 0);
  commandStream.set(rasterBytes, header.length);
  commandStream.set(footer, header.length + rasterBytes.length);

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
