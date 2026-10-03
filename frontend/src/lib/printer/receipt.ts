import { formatPaise } from "@/lib/format/money";
import { buildUpiUri } from "@/lib/upi";
import type { Job } from "@/features/jobs/api";
import type { Invoice } from "@/features/invoices/api";
import type { Payment } from "@/features/billing/api";

export interface ReceiptLine {
  left: string;
  right?: string;
  bold?: boolean;
  align?: "left" | "center" | "right";
  separator?: boolean;
}

export interface ReceiptHeader {
  shopName: string;
  shopPhone?: string | null;
  shopAddress?: string | null;
  shopGstin?: string | null;
  date: string;
  documentNumber: string;
  customerName?: string;
  customerPhone?: string;
}

export interface ReceiptModel {
  title: string;
  header: ReceiptHeader;
  lines: ReceiptLine[];
  qr?: {
    data: string;
    caption?: string;
  };
  footer?: string[];
}

export interface ShopReceiptInfo {
  name: string;
  phone?: string | null;
  address_line1?: string | null;
  city?: string | null;
  pincode?: string | null;
  gstin?: string | null;
  upi_id?: string | null;
}

export function jobReceiptModel(
  job: Job,
  shop?: ShopReceiptInfo | null,
  labels?: Record<string, string>,
): ReceiptModel {
  const shopName = shop?.name || "Repair Shop";
  const shopAddress = [shop?.address_line1, shop?.city, shop?.pincode].filter(Boolean).join(", ");
  const dateStr = new Date(job.created_at).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const deviceName = `${job.device.brand_name || ""} ${job.device.model}`.trim();
  const primaryImei = job.device.identifiers?.find((i) => i.type.startsWith("imei"))?.value;
  const serialNo = job.device.identifiers?.find((i) => i.type === "serial")?.value;

  const estimatePaise = job.estimate_paise || 0;
  const paidPaise = job.paid_paise || 0;
  const balancePaise =
    job.balance_paise ?? Math.max(0, (job.total_paise && job.total_paise > 0 ? job.total_paise : estimatePaise) - paidPaise);

  const lines: ReceiptLine[] = [
    { left: "DEVICE DETAILS", bold: true },
    { left: "Device:", right: deviceName },
  ];

  if (primaryImei) {
    lines.push({ left: "IMEI:", right: primaryImei });
  } else if (serialNo) {
    lines.push({ left: "Serial:", right: serialNo });
  }

  if (job.fault_description) {
    lines.push({ left: "Reported Fault:", right: job.fault_description });
  }

  if (job.device_condition) {
    lines.push({ left: "Condition:", right: job.device_condition });
  }

  if (job.accessories && job.accessories.length > 0) {
    const accList = job.accessories.map((a) => a.name).join(", ");
    lines.push({ left: "Accessories:", right: accList });
  }

  lines.push({ separator: true, left: "" });
  lines.push({ left: "FINANCIAL SUMMARY", bold: true });
  lines.push({ left: "Estimate:", right: formatPaise(estimatePaise) });
  lines.push({ left: "Advance Paid:", right: formatPaise(paidPaise) });
  lines.push({ left: "Balance Due:", right: formatPaise(balancePaise), bold: true });

  const qrData = job.tracking_url || `https://track.fixpro.in/t/${job.tracking_token || job.id}/`;

  return {
    title: labels?.intakeReceipt || "REPAIR INTAKE RECEIPT",
    header: {
      shopName,
      shopPhone: shop?.phone,
      shopAddress: shopAddress || undefined,
      shopGstin: shop?.gstin || undefined,
      date: dateStr,
      documentNumber: `Job #${job.job_no}`,
      customerName: job.customer.name,
      customerPhone: job.customer.phone_masked ? undefined : job.customer.phone,
    },
    lines,
    qr: {
      data: qrData,
      caption: labels?.scanToTrack || "Scan to track repair progress",
    },
    footer: [
      "Thank you for choosing us!",
      "Estimated cost subject to internal hardware diagnosis.",
      "Customer signature required at time of delivery.",
    ],
  };
}

export function paymentReceiptModel(
  job: { job_no: number; device?: { brand_name?: string; model?: string } },
  payment: Payment,
  shop?: ShopReceiptInfo | null,
  balanceRemainingPaise = 0,
  labels?: Record<string, string>,
): ReceiptModel {
  const shopName = shop?.name || "Repair Shop";
  const shopAddress = [shop?.address_line1, shop?.city, shop?.pincode].filter(Boolean).join(", ");
  const dateStr = new Date(payment.created_at).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const lines: ReceiptLine[] = [
    { left: "PAYMENT DETAILS", bold: true },
    { left: "Job Order:", right: `Job #${job.job_no}` },
  ];

  if (job.device) {
    const dev = `${job.device.brand_name || ""} ${job.device.model || ""}`.trim();
    if (dev) lines.push({ left: "Device:", right: dev });
  }

  lines.push({ left: "Payment Mode:", right: payment.mode.toUpperCase() });

  if (payment.reference) {
    lines.push({ left: "Ref / UTR:", right: payment.reference });
  }

  lines.push({ separator: true, left: "" });
  lines.push({ left: "Amount Paid:", right: formatPaise(payment.amount_paise), bold: true });
  lines.push({ left: "Remaining Balance:", right: formatPaise(balanceRemainingPaise) });

  return {
    title: labels?.paymentReceipt || "PAYMENT RECEIPT",
    header: {
      shopName,
      shopPhone: shop?.phone,
      shopAddress: shopAddress || undefined,
      shopGstin: shop?.gstin || undefined,
      date: dateStr,
      documentNumber: `REC-${payment.id.slice(0, 8).toUpperCase()}`,
    },
    lines,
    footer: ["Payment received with thanks.", "Computer generated payment slip."],
  };
}

export function invoiceReceiptModel(
  invoice: Invoice,
  shop?: ShopReceiptInfo | null,
  labels?: Record<string, string>,
): ReceiptModel {
  const snapshotShop = (invoice.shop_snapshot || {}) as Record<string, string>;
  const snapshotCustomer = (invoice.customer_snapshot || {}) as Record<string, string>;

  const shopName = snapshotShop.name || shop?.name || "Repair Shop";
  const shopAddress = snapshotShop.address || [shop?.address_line1, shop?.city, shop?.pincode].filter(Boolean).join(", ");
  const shopPhone = snapshotShop.phone || shop?.phone;
  const shopGstin = snapshotShop.gstin || shop?.gstin;
  const shopUpi = snapshotShop.upi_id || shop?.upi_id;

  const dateStr = invoice.issue_date
    ? new Date(invoice.issue_date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  const lines: ReceiptLine[] = [{ left: "ITEMIZED PARTICULARS", bold: true }];

  for (const line of invoice.lines || []) {
    lines.push({
      left: line.description,
      right: formatPaise(line.line_total_paise),
    });
    if (Number(line.quantity) > 1 || line.discount_paise > 0) {
      const details = `${line.quantity} × ${formatPaise(line.unit_price_paise)}${
        line.discount_paise > 0 ? ` (disc -${formatPaise(line.discount_paise)})` : ""
      }`;
      lines.push({ left: `  ${details}` });
    }
  }

  lines.push({ separator: true, left: "" });
  lines.push({ left: "Subtotal:", right: formatPaise(invoice.subtotal_paise) });

  if (invoice.discount_paise > 0) {
    lines.push({ left: "Discount:", right: `-${formatPaise(invoice.discount_paise)}` });
  }

  if (invoice.cgst_paise > 0) {
    lines.push({ left: "CGST:", right: formatPaise(invoice.cgst_paise) });
    lines.push({ left: "SGST:", right: formatPaise(invoice.sgst_paise) });
  } else if (invoice.igst_paise > 0) {
    lines.push({ left: "IGST:", right: formatPaise(invoice.igst_paise) });
  }

  if (invoice.round_off_paise !== 0) {
    lines.push({
      left: "Round Off:",
      right: `${invoice.round_off_paise > 0 ? "+" : ""}${formatPaise(invoice.round_off_paise)}`,
    });
  }

  lines.push({ separator: true, left: "" });
  lines.push({ left: "Grand Total:", right: formatPaise(invoice.total_paise), bold: true });
  lines.push({ left: "Paid:", right: formatPaise(invoice.amount_paid_paise) });
  lines.push({ left: "Balance Due:", right: formatPaise(invoice.balance_paise), bold: true });

  let qr: { data: string; caption?: string } | undefined;
  if (invoice.balance_paise > 0 && shopUpi) {
    qr = {
      data: buildUpiUri({
        vpa: shopUpi,
        payeeName: shopName,
        amountPaise: invoice.balance_paise,
        note: invoice.number_display || "Invoice Payment",
      }),
      caption: labels?.scanToPay || "Scan to pay via UPI",
    };
  }

  return {
    title: invoice.kind === "credit_note" ? "CREDIT NOTE" : "TAX INVOICE",
    header: {
      shopName,
      shopPhone,
      shopAddress: shopAddress || undefined,
      shopGstin: shopGstin || undefined,
      date: dateStr,
      documentNumber: invoice.number_display || "Invoice",
      customerName: snapshotCustomer.name,
      customerPhone: snapshotCustomer.phone,
    },
    lines,
    qr,
    footer: ["Thank you for your business!", "Computer generated document."],
  };
}

export function testReceiptModel(shop?: ShopReceiptInfo | null): ReceiptModel {
  return {
    title: "THERMAL PRINTER TEST",
    header: {
      shopName: shop?.name || "FixPro Repair Workshop",
      shopPhone: shop?.phone || "9876543210",
      shopAddress: shop?.address_line1 || "Repair Market, Main Road",
      date: new Date().toLocaleDateString("en-IN"),
      documentNumber: "TEST-001",
    },
    lines: [
      { left: "FixPro Thermal Receipt Engine", bold: true, align: "center" },
      { left: "फिक्सप्रो थर्मल प्रिंटर टेस्ट", bold: true, align: "center" },
      { separator: true, left: "" },
      { left: "Printer Status:", right: "OK / सक्रिय" },
      { left: "Devanagari Font:", right: "Noto Sans Hindi" },
      { left: "Bit Depth:", right: "1-Bit Monochrome" },
      { left: "Raster Format:", right: "ESC/POS (GS v 0)" },
      { separator: true, left: "" },
      { left: "यह रसीद स्पष्ट रूप से पढ़नी चाहिए।", align: "center" },
    ],
    qr: {
      data: "https://fixpro.in",
      caption: "fixpro.in",
    },
    footer: ["All systems operational.", "सब कुछ ठीक से काम कर रहा है।"],
  };
}
