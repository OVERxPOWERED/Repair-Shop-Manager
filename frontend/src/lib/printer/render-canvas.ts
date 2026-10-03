import QRCode from "qrcode";

import { canvasToEscPosRaster } from "./rasterizer";
import type { ReceiptModel, ReceiptLine } from "./receipt";
import {
  type PaperWidth,
  DOTS,
  PrinterError,
  type PrinterService,
} from "@/native/printer/types";
import {
  getPrinterService,
  getStoredPrinterConfig,
} from "@/native/printer";

export interface RenderCanvasOptions {
  paperWidth: PaperWidth;
}

export interface PrintReceiptOptions {
  paperWidth?: PaperWidth;
  autoCut?: boolean;
  dithering?: boolean;
  printerService?: PrinterService;
}

/**
 * Loads required Noto Sans / Devanagari fonts before canvas rendering.
 */
async function ensureFontsLoaded(): Promise<void> {
  if (typeof document === "undefined" || !document.fonts || !document.fonts.load) {
    return;
  }
  try {
    await Promise.allSettled([
      document.fonts.load("bold 20px 'Noto Sans'"),
      document.fonts.load("14px 'Noto Sans'"),
      document.fonts.load("bold 20px 'Noto Sans Devanagari'"),
      document.fonts.load("14px 'Noto Sans Devanagari'"),
    ]);
  } catch {
    // Fall back to system fonts if remote font loading fails
  }
}

/**
 * Helper to wrap text into multiple lines if it exceeds maxWidth.
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  if (!text) return [""];
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(`${currentLine} ${word}`).width;
    if (width < maxWidth) {
      currentLine += ` ${word}`;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

/**
 * Renders a pure ReceiptModel into an HTMLCanvasElement formatted for 58mm (384px) or 80mm (576px).
 */
export async function renderReceiptToCanvas(
  model: ReceiptModel,
  options: RenderCanvasOptions,
): Promise<HTMLCanvasElement> {
  await ensureFontsLoaded();

  const width = DOTS[options.paperWidth] || 384;
  const padding = options.paperWidth === 80 ? 20 : 12;
  const contentWidth = width - padding * 2;
  const fontSans = "'Noto Sans', 'Noto Sans Devanagari', -apple-system, BlinkMacSystemFont, sans-serif";

  // First pass: Calculate required height
  const measureCanvas = document.createElement("canvas");
  measureCanvas.width = width;
  measureCanvas.height = 100;
  const mCtx = measureCanvas.getContext("2d");
  if (!mCtx) throw new Error("Could not initialize measurement canvas context");

  let computedHeight = 24; // top margin

  // Title
  computedHeight += 32;

  // Header lines
  if (model.header.shopName) computedHeight += 26;
  if (model.header.shopAddress) computedHeight += 20;
  if (model.header.shopPhone || model.header.shopGstin) computedHeight += 20;
  computedHeight += 16; // divider

  // Doc number & date & customer
  computedHeight += 22;
  if (model.header.customerName) computedHeight += 20;
  if (model.header.customerPhone) computedHeight += 20;
  computedHeight += 16; // divider

  // Body lines
  for (const line of model.lines) {
    if (line.separator) {
      computedHeight += 16;
    } else {
      mCtx.font = line.bold ? `bold 14px ${fontSans}` : `13px ${fontSans}`;
      const rightWidth = line.right ? mCtx.measureText(line.right).width + 12 : 0;
      const leftMaxWidth = contentWidth - rightWidth;
      const wrapped = wrapText(mCtx, line.left, leftMaxWidth);
      computedHeight += Math.max(1, wrapped.length) * 20;
    }
  }

  // QR code
  if (model.qr) {
    const qrSize = options.paperWidth === 80 ? 190 : 150;
    computedHeight += qrSize + 20;
    if (model.qr.caption) computedHeight += 20;
  }

  // Footer lines
  if (model.footer && model.footer.length > 0) {
    computedHeight += 20;
    computedHeight += model.footer.length * 18;
  }

  computedHeight += 36; // bottom feed buffer

  // Second pass: Draw onto real canvas
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = Math.ceil(computedHeight);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not initialize rendering canvas context");

  // Fill white background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#000000";
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 1;

  let y = 28;

  // Title
  ctx.textAlign = "center";
  ctx.font = `bold 17px ${fontSans}`;
  ctx.fillText(model.title, width / 2, y);
  y += 26;

  // Header Details
  ctx.font = `bold 15px ${fontSans}`;
  ctx.fillText(model.header.shopName, width / 2, y);
  y += 20;

  ctx.font = `12px ${fontSans}`;
  if (model.header.shopAddress) {
    ctx.fillText(model.header.shopAddress, width / 2, y);
    y += 18;
  }

  const phoneGstin = [
    model.header.shopPhone ? `Ph: +91 ${model.header.shopPhone}` : "",
    model.header.shopGstin ? `GSTIN: ${model.header.shopGstin}` : "",
  ]
    .filter(Boolean)
    .join(" | ");
  if (phoneGstin) {
    ctx.fillText(phoneGstin, width / 2, y);
    y += 18;
  }

  // Divider
  const drawDivider = (currentY: number) => {
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.moveTo(padding, currentY);
    ctx.lineTo(width - padding, currentY);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  y += 4;
  drawDivider(y);
  y += 18;

  // Document Number & Date row
  ctx.font = `bold 13px ${fontSans}`;
  ctx.textAlign = "left";
  ctx.fillText(model.header.documentNumber, padding, y);
  ctx.textAlign = "right";
  ctx.font = `12px ${fontSans}`;
  ctx.fillText(model.header.date, width - padding, y);
  y += 18;

  // Customer row if present
  if (model.header.customerName) {
    ctx.textAlign = "left";
    ctx.font = `12px ${fontSans}`;
    ctx.fillText(`Customer: ${model.header.customerName}`, padding, y);
    if (model.header.customerPhone) {
      ctx.textAlign = "right";
      ctx.fillText(model.header.customerPhone, width - padding, y);
    }
    y += 18;
  }

  y += 4;
  drawDivider(y);
  y += 16;

  // Body lines
  for (const line of model.lines) {
    if (line.separator) {
      y += 2;
      drawDivider(y);
      y += 14;
      continue;
    }

    ctx.font = line.bold ? `bold 13px ${fontSans}` : `12px ${fontSans}`;

    if (line.align === "center") {
      ctx.textAlign = "center";
      ctx.fillText(line.left, width / 2, y);
      y += 18;
      continue;
    }

    const rightText = line.right || "";
    const rightWidth = rightText ? ctx.measureText(rightText).width + 8 : 0;
    const leftMaxWidth = contentWidth - rightWidth;
    const wrappedLeft = wrapText(ctx, line.left, leftMaxWidth);

    ctx.textAlign = "left";
    ctx.fillText(wrappedLeft[0] || "", padding, y);

    if (rightText) {
      ctx.textAlign = "right";
      ctx.fillText(rightText, width - padding, y);
    }

    y += 18;

    for (let w = 1; w < wrappedLeft.length; w++) {
      ctx.textAlign = "left";
      ctx.fillText(wrappedLeft[w], padding, y);
      y += 18;
    }
  }

  // QR Code Rendering
  if (model.qr && model.qr.data) {
    y += 10;
    const qrSize = options.paperWidth === 80 ? 180 : 140;
    const qrCanvas = document.createElement("canvas");
    try {
      await QRCode.toCanvas(qrCanvas, model.qr.data, {
        width: qrSize,
        margin: 1,
        color: { dark: "#000000", light: "#ffffff" },
      });
      const qrX = (width - qrSize) / 2;
      ctx.drawImage(qrCanvas, qrX, y);
      y += qrSize + 12;

      if (model.qr.caption) {
        ctx.textAlign = "center";
        ctx.font = `11px ${fontSans}`;
        ctx.fillText(model.qr.caption, width / 2, y);
        y += 16;
      }
    } catch {
      // If QR fails to generate, continue without failing whole print
    }
  }

  // Footer lines
  if (model.footer && model.footer.length > 0) {
    y += 8;
    drawDivider(y);
    y += 16;

    ctx.textAlign = "center";
    ctx.font = `italic 11px ${fontSans}`;
    for (const fLine of model.footer) {
      ctx.fillText(fLine, width / 2, y);
      y += 16;
    }
  }

  return canvas;
}

/**
 * End-to-end receipt print flow:
 * 1. Resolves config & active printer
 * 2. Renders receipt model to canvas
 * 3. Converts to ESC/POS raster byte stream
 * 4. Transmits to printer with auto-cut
 */
export async function printReceipt(
  model: ReceiptModel,
  options: PrintReceiptOptions = {},
): Promise<void> {
  const config = await getStoredPrinterConfig();
  const paperWidth = options.paperWidth ?? config.paperWidth ?? 58;
  const autoCut = options.autoCut ?? config.autoCut ?? true;
  const dithering = options.dithering ?? config.dithering ?? false;

  const printer = options.printerService ?? getPrinterService();

  if (!printer.isConnected()) {
    if (config.printerId) {
      await printer.connect(config.printerId);
    } else {
      throw new PrinterError(
        "not_found",
        "No thermal printer configured. Please connect a printer in settings.",
      );
    }
  }

  const canvas = await renderReceiptToCanvas(model, { paperWidth });
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not acquire 2D canvas context");

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const rasterBytes = canvasToEscPosRaster(
    { width: canvas.width, height: canvas.height, data: imageData.data },
    { width: DOTS[paperWidth], dithering, cut: autoCut },
  );

  await printer.write(rasterBytes);
}
