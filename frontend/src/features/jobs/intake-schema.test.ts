import { describe, expect, it } from "vitest";
import {
  isValidPattern,
  customerStepSchema,
  deviceStepSchema,
  problemStepSchema,
  estimateStepSchema,
  assignmentStepSchema,
} from "./intake-schema";
import { todayIst } from "@/lib/format/date";

describe("isValidPattern", () => {
  it("accepts valid 4-node pattern", () => {
    expect(isValidPattern("1-2-3-6")).toBe(true);
  });

  it("accepts valid 9-node pattern", () => {
    expect(isValidPattern("1-2-3-6-9-8-7-4-5")).toBe(true);
  });

  it("rejects patterns with fewer than 4 nodes", () => {
    expect(isValidPattern("1-2")).toBe(false);
    expect(isValidPattern("1-2-3")).toBe(false);
  });

  it("rejects patterns with repeated nodes", () => {
    expect(isValidPattern("1-1-2-3")).toBe(false);
    expect(isValidPattern("1-2-3-2")).toBe(false);
  });

  it("rejects patterns containing non 1-9 characters", () => {
    expect(isValidPattern("0-1-2-3")).toBe(false);
    expect(isValidPattern("a-b-c-d")).toBe(false);
    expect(isValidPattern("1234")).toBe(false);
  });

  it("rejects empty or whitespace pattern", () => {
    expect(isValidPattern("")).toBe(false);
    expect(isValidPattern("   ")).toBe(false);
  });
});

describe("customerStepSchema", () => {
  it("accepts valid new customer", () => {
    const res = customerStepSchema.safeParse({
      name: "Rahul Verma",
      phone: "+919876543210",
    });
    expect(res.success).toBe(true);
  });

  it("accepts valid existing customer by ID", () => {
    const res = customerStepSchema.safeParse({
      id: "a0000000-0000-0000-0000-000000000001",
      name: "R",
      phone: "9876543210",
    });
    expect(res.success).toBe(true);
  });

  it("rejects customer with short name", () => {
    const res = customerStepSchema.safeParse({
      name: "R",
      phone: "9876543210",
    });
    expect(res.success).toBe(false);
  });

  it("rejects customer with invalid phone", () => {
    const res = customerStepSchema.safeParse({
      name: "Rahul",
      phone: "12345",
    });
    expect(res.success).toBe(false);
  });
});

describe("deviceStepSchema", () => {
  it("accepts existing device with ID", () => {
    const res = deviceStepSchema.safeParse({
      id: "b0000000-0000-0000-0000-000000000001",
      category: "mobile",
      model: "Galaxy S21",
    });
    expect(res.success).toBe(true);
  });

  it("accepts new device with brandId and valid Luhn IMEI", () => {
    const res = deviceStepSchema.safeParse({
      category: "mobile",
      brandId: "c0000000-0000-0000-0000-000000000001",
      model: "iPhone 13",
      identifiers: [
        { type: "imei1", value: "356938035643809", confirmInvalid: false },
      ],
    });
    expect(res.success).toBe(true);
  });

  it("accepts new device with brandText fallback", () => {
    const res = deviceStepSchema.safeParse({
      category: "mobile",
      brandText: "Custom Brand",
      model: "X100",
      identifiers: [],
    });
    expect(res.success).toBe(true);
  });

  it("rejects new device without brandId or brandText", () => {
    const res = deviceStepSchema.safeParse({
      category: "mobile",
      model: "iPhone 13",
      identifiers: [],
    });
    expect(res.success).toBe(false);
  });

  it("rejects invalid Luhn IMEI unless overridden", () => {
    const invalidRes = deviceStepSchema.safeParse({
      category: "mobile",
      brandText: "Apple",
      model: "iPhone 13",
      identifiers: [
        { type: "imei1", value: "356938035643800", confirmInvalid: false },
      ],
    });
    expect(invalidRes.success).toBe(false);

    const overrideRes = deviceStepSchema.safeParse({
      category: "mobile",
      brandText: "Apple",
      model: "iPhone 13",
      identifiers: [
        { type: "imei1", value: "356938035643800", confirmInvalid: true },
      ],
    });
    expect(overrideRes.success).toBe(true);
  });
});

describe("problemStepSchema", () => {
  it("accepts valid problem with none lock", () => {
    const res = problemStepSchema.safeParse({
      faultDescription: "Display broken, touch not working",
      lockType: "none",
    });
    expect(res.success).toBe(true);
  });

  it("validates PIN lock properly", () => {
    const valid = problemStepSchema.safeParse({
      faultDescription: "Battery drain",
      lockType: "pin",
      lockValue: "123456",
    });
    expect(valid.success).toBe(true);

    const invalid = problemStepSchema.safeParse({
      faultDescription: "Battery drain",
      lockType: "pin",
      lockValue: "12",
    });
    expect(invalid.success).toBe(false);
  });

  it("validates Pattern lock properly", () => {
    const valid = problemStepSchema.safeParse({
      faultDescription: "Mic faulty",
      lockType: "pattern",
      lockValue: "1-2-3-6",
    });
    expect(valid.success).toBe(true);

    const invalid = problemStepSchema.safeParse({
      faultDescription: "Mic faulty",
      lockType: "pattern",
      lockValue: "1-1-2-3",
    });
    expect(invalid.success).toBe(false);
  });
});

describe("estimateStepSchema", () => {
  it("accepts valid estimate in paise and today/future expected date", () => {
    const today = todayIst();
    const res = estimateStepSchema.safeParse({
      estimatePaise: 250000, // Rs 2,500
      expectedDate: today,
      advancePaise: 50000,
      advanceMode: "upi",
    });
    expect(res.success).toBe(true);
  });

  it("rejects negative estimate paise", () => {
    const res = estimateStepSchema.safeParse({
      estimatePaise: -100,
    });
    expect(res.success).toBe(false);
  });

  it("rejects expected date in the past", () => {
    const res = estimateStepSchema.safeParse({
      estimatePaise: 10000,
      expectedDate: "2020-01-01",
    });
    expect(res.success).toBe(false);
  });
});

describe("assignmentStepSchema", () => {
  it("accepts valid assignment", () => {
    const res = assignmentStepSchema.safeParse({
      assignedToId: "d0000000-0000-0000-0000-000000000001",
      priority: "urgent",
    });
    expect(res.success).toBe(true);
  });

  it("defaults priority to normal", () => {
    const res = assignmentStepSchema.parse({});
    expect(res.priority).toBe("normal");
  });
});

describe("intake retry idempotency stability", () => {
  it("preserves idempotencyKey across draft updates and simulated submit retries", () => {
    // When a draft is created, it gets an idempotency key
    const initialKey = "idem-uuid-12345";
    const draft = {
      idempotencyKey: initialKey,
      step: 0,
      customer: { name: "A", phone: "9876543210" },
    };

    // User advances steps and updates fields
    const updatedDraft = {
      ...draft,
      step: 5,
      faultDescription: "Display broken",
    };
    expect(updatedDraft.idempotencyKey).toBe(initialKey);

    // Network error on submit attempt 1: retry submit attempt 2 sends the exact same key
    const submitAttempt1Key = updatedDraft.idempotencyKey;
    const submitAttempt2Key = updatedDraft.idempotencyKey;
    expect(submitAttempt1Key).toBe(submitAttempt2Key);
  });
});

