import { z } from "zod";

export const phoneSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "auth.invalidPhone"),
});

export type PhoneFormValues = z.infer<typeof phoneSchema>;

export const otpSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "auth.invalidOtp"),
});

export type OtpFormValues = z.infer<typeof otpSchema>;

export const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "auth.nameTooShort")
    .max(120, "auth.nameTooLong"),
  email: z
    .string()
    .trim()
    .email("auth.invalidEmail")
    .or(z.literal(""))
    .nullable()
    .optional(),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "auth.invalidPhone")
    .or(z.literal(""))
    .nullable()
    .optional(),
  preferred_locale: z.enum(["en", "hi", "hi-Latn"]),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
