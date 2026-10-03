import { describe, it, expect } from "vitest";
import { customerFormSchema } from "./schema";

describe("Customer Form Schema", () => {
  it("validates valid customer with 10-digit mobile number", () => {
    const res = customerFormSchema.safeParse({
      name: "Ramesh Sharma",
      phone: "9876543210",
      email: "ramesh@example.com",
      preferred_locale: "hi",
      whatsapp_opt_in: true,
      sms_opt_in: true,
    });
    expect(res.success).toBe(true);
  });

  it("accepts customer without phone", () => {
    const res = customerFormSchema.safeParse({
      name: "Walk-in Customer",
      phone: "",
    });
    expect(res.success).toBe(true);
  });

  it("rejects empty customer name", () => {
    const res = customerFormSchema.safeParse({
      name: "   ",
      phone: "9876543210",
    });
    expect(res.success).toBe(false);
  });

  it("rejects invalid phone format", () => {
    const res = customerFormSchema.safeParse({
      name: "Ramesh",
      phone: "12345",
    });
    expect(res.success).toBe(false);
  });

  it("rejects invalid email format", () => {
    const res = customerFormSchema.safeParse({
      name: "Ramesh",
      email: "invalid-email",
    });
    expect(res.success).toBe(false);
  });
});
