import { z } from "zod";

export const deviceIdentifierSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["imei1", "imei2", "serial", "meid"]),
  value: z.string().trim().min(1, "Value is required"),
  captured_via: z.enum(["manual", "barcode", "ocr"]).default("manual"),
  confirm_invalid: z.boolean().default(false),
});

export const deviceFormSchema = z.object({
  category: z.enum(["mobile", "laptop", "tv", "appliance", "other"]).default("mobile"),
  brand_id: z.string().nullable().optional(),
  brand_text: z.string().trim().optional(),
  model: z.string().trim().min(1, "Model is required"),
  color: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  identifiers: z.array(deviceIdentifierSchema).default([]),
});

export type DeviceFormValues = z.infer<typeof deviceFormSchema>;
