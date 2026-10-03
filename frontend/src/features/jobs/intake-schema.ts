import { z } from "zod";
import { isValidIMEI } from "@/lib/validation/imei";
import { todayIst } from "@/lib/format/date";

/**
 * Validates a 3x3 pattern lock sequence.
 * - Nodes are digits 1-9 separated by hyphens (e.g., '1-2-3-6').
 * - Must contain between 4 and 9 nodes.
 * - Nodes cannot be repeated.
 */
export function isValidPattern(pattern: string): boolean {
  if (!pattern || typeof pattern !== "string") return false;
  const trimmed = pattern.trim();
  if (!/^[1-9](-[1-9]){3,8}$/.test(trimmed)) return false;
  const nodes = trimmed.split("-");
  return new Set(nodes).size === nodes.length;
}

export const customerStepSchema = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().trim().max(150).optional().default(""),
    phone: z.string().trim().optional().default(""),
  })
  .superRefine((data, ctx) => {
    if (data.id) return;
    if (!data.name || data.name.trim().length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["name"],
        message: "errors.nameRequired",
      });
    }
    const digits = (data.phone || "").replace(/\D/g, "");
    if (!(digits.length === 10 || (digits.length === 12 && digits.startsWith("91")))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phone"],
        message: "errors.phoneInvalid",
      });
    }
  });

export const deviceIdentifierSchema = z.object({
  type: z.enum(["imei1", "imei2", "serial", "meid"]),
  value: z.string().trim().min(1, "errors.identifierValueRequired"),
  capturedVia: z.enum(["manual", "barcode", "ocr"]).optional(),
  confirmInvalid: z.boolean().optional(),
});

export const deviceStepSchema = z
  .object({
    id: z.string().uuid().optional(),
    category: z.string().min(1, "errors.categoryRequired"),
    brandId: z.string().uuid().optional(),
    brandText: z.string().trim().optional(),
    model: z.string().trim().min(1, "errors.modelRequired"),
    color: z.string().trim().optional().default(""),
    identifiers: z.array(deviceIdentifierSchema).default([]),
  })
  .superRefine((data, ctx) => {
    // If device already exists by ID, skip brand/identifier checks
    if (data.id) return;

    if (!data.brandId && (!data.brandText || data.brandText.trim().length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["brandId"],
        message: "errors.brandRequired",
      });
    }

    // Validate IMEI identifiers with Luhn check unless overridden
    data.identifiers.forEach((ident, idx) => {
      if ((ident.type === "imei1" || ident.type === "imei2") && !ident.confirmInvalid) {
        if (!isValidIMEI(ident.value)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["identifiers", idx, "value"],
            message: "errors.imeiInvalid",
          });
        }
      }
    });
  });

export const conditionStepSchema = z.object({
  conditionTags: z.array(z.string()).default([]),
  deviceCondition: z.string().default(""),
});

export const accessoriesStepSchema = z.object({
  accessories: z.array(z.string()).default([]),
});

export const problemStepSchema = z
  .object({
    faultDescription: z.string().trim().min(3, "errors.faultRequired"),
    lockType: z.enum(["none", "pin", "pattern", "password"]).default("none"),
    lockValue: z.string().trim().default(""),
    internalNote: z.string().trim().default(""),
  })
  .superRefine((data, ctx) => {
    const { lockType, lockValue } = data;
    if (lockType === "pin") {
      if (!/^\d{4,16}$/.test(lockValue)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["lockValue"],
          message: "errors.pinInvalid",
        });
      }
    } else if (lockType === "pattern") {
      if (!isValidPattern(lockValue)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["lockValue"],
          message: "errors.patternInvalid",
        });
      }
    } else if (lockType === "password") {
      if (lockValue.length < 1 || lockValue.length > 64) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["lockValue"],
          message: "errors.passwordInvalid",
        });
      }
    }
  });

export const estimateStepSchema = z
  .object({
    estimatePaise: z.number().int().min(0, "errors.estimateInvalid").default(0),
    expectedDate: z.string().nullable().default(null),
    advancePaise: z.number().int().min(0).default(0),
    advanceMode: z.enum(["cash", "upi", "card", "bank"]).default("cash"),
  })
  .superRefine((data, ctx) => {
    if (data.expectedDate) {
      const today = todayIst();
      if (data.expectedDate < today) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["expectedDate"],
          message: "errors.expectedDatePast",
        });
      }
    }
  });

export const assignmentStepSchema = z.object({
  assignedToId: z.string().uuid().nullable().optional(),
  priority: z.enum(["low", "normal", "urgent"]).default("normal"),
});
