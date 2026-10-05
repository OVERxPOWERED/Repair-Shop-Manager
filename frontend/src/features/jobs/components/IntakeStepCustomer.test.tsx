import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { IntlProvider } from "@/i18n/IntlProvider";
import { IntakeStepCustomer } from "./IntakeStepCustomer";
import { useIntakeStore } from "../intake-store";

vi.mock("@/features/customers/api", () => ({
  useCustomers: vi.fn().mockReturnValue({
    data: {
      pages: [
        {
          items: [
            { id: "cust-1", name: "Suresh Verma", phone: "9829012345" },
          ],
        },
      ],
    },
    isPending: false,
  }),
}));

function renderWithIntl(ui: React.ReactElement) {
  return render(<IntlProvider>{ui}</IntlProvider>);
}

describe("IntakeStepCustomer", () => {
  beforeEach(() => {
    useIntakeStore.getState().clearDraft();
  });

  it("navigates to phone input when pressing Enter in customer name", () => {
    renderWithIntl(<IntakeStepCustomer onNext={vi.fn()} />);

    // Switch to new customer mode
    const newBtn = screen.getByRole("button", { name: /New Customer/i });
    fireEvent.click(newBtn);

    const nameInput = screen.getByPlaceholderText(/e\.g\. Ramesh Kumar|Ramesh/i);
    const phoneInput = screen.getByPlaceholderText("9876543210");

    nameInput.focus();
    fireEvent.change(nameInput, { target: { value: "Shabbir Rajas" } });

    // Press Enter in name input
    fireEvent.keyDown(nameInput, { key: "Enter", code: "Enter" });

    // Expect focus to have moved to phoneInput
    expect(document.activeElement).toBe(phoneInput);
  });

  it("triggers onNext when pressing Enter in phone input", () => {
    const handleNext = vi.fn();
    renderWithIntl(<IntakeStepCustomer onNext={handleNext} />);

    // Switch to new customer mode
    const newBtn = screen.getByRole("button", { name: /New Customer/i });
    fireEvent.click(newBtn);

    const phoneInput = screen.getByPlaceholderText("9876543210");
    fireEvent.change(phoneInput, { target: { value: "9039800209" } });

    // Press Enter in phone input
    fireEvent.keyDown(phoneInput, { key: "Enter", code: "Enter" });

    expect(handleNext).toHaveBeenCalledTimes(1);
  });
});
