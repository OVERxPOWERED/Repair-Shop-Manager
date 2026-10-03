import { z } from "zod";
import { normalizePhone } from "@/lib/format/phone";

export const customerFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  phone: z
    .string()
    .trim()
    .refine((val) => {
      if (!val) return true;
      try {
        normalizePhone(val);
        return true;
      } catch {
        return false;
      }
    }, "Enter a valid 10-digit mobile number")
    .optional()
    .or(z.literal("")),
  alt_phone: z
    .string()
    .trim()
    .refine((val) => {
      if (!val) return true;
      try {
        normalizePhone(val);
        return true;
      } catch {
        return false;
      }
    }, "Enter a valid 10-digit mobile number")
    .optional()
    .or(z.literal("")),
  email: z.string().trim().email("Invalid email address").optional().or(z.literal("")),
  address: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
  preferred_locale: z.enum(["en", "hi", "hi-Latn"]).default("en"),
  whatsapp_opt_in: z.boolean().default(true),
  sms_opt_in: z.boolean().default(true),
});

export type CustomerFormValues = z.infer<typeof customerFormSchema>;
