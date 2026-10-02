import { z } from "zod";
import { isValidGstin } from "@/lib/validation/gstin";
import { isValidUpiId } from "@/lib/validation/upi";
import { GST_STATE_MAP } from "@/lib/constants/gst-states";

export const shopTypeEnum = z.enum(["mobile", "computer", "appliance", "other"]);
export type ShopType = z.infer<typeof shopTypeEnum>;

export const onboardingSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "onboarding.nameRequired")
      .max(150, "onboarding.nameTooLong"),
    shop_type: shopTypeEnum,
    phone: z
      .string()
      .trim()
      .regex(/^[6-9]\d{9}$/, "onboarding.invalidPhone")
      .or(z.literal(""))
      .optional(),
    address_line1: z.string().trim().max(255).optional(),
    city: z.string().trim().max(100).optional(),
    pincode: z
      .string()
      .trim()
      .regex(/^\d{6}$/, "onboarding.invalidPincode")
      .or(z.literal(""))
      .optional(),
    state_code: z
      .string()
      .refine((val) => !val || Boolean(GST_STATE_MAP[val]), {
        message: "onboarding.invalidState",
      }),
    gst_enabled: z.boolean(),
    gstin: z.string().trim(),
    upi_id: z
      .string()
      .trim()
      .refine((val) => !val || isValidUpiId(val), {
        message: "onboarding.invalidUpi",
      }),
  })
  .superRefine((data, ctx) => {
    if (data.gst_enabled) {
      if (!data.gstin) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["gstin"],
          message: "onboarding.gstinRequired",
        });
      } else if (!isValidGstin(data.gstin)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["gstin"],
          message: "onboarding.invalidGstin",
        });
      } else if (data.state_code && data.state_code !== data.gstin.slice(0, 2)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["state_code"],
          message: "onboarding.stateMustMatchGstin",
        });
      }
    }
  });

export type OnboardingFormValues = z.infer<typeof onboardingSchema>;
