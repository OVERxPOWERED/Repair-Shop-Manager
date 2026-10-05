import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { IntlProvider } from "@/i18n/IntlProvider";
import { UpiTestQrModal } from "./UpiTestQrModal";

vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,fakeQrDataUrl"),
  },
}));

function renderWithIntl(ui: React.ReactElement) {
  return render(<IntlProvider>{ui}</IntlProvider>);
}

describe("UpiTestQrModal", () => {
  it("renders modal content when open with shop name and UPI ID", () => {
    renderWithIntl(
      <UpiTestQrModal
        open={true}
        onOpenChange={vi.fn()}
        shopName="Star Mobile"
        upiId="starmobile@okaxis"
      />
    );

    expect(screen.getByText("Star Mobile")).toBeDefined();
    expect(screen.getByText("starmobile@okaxis")).toBeDefined();
  });

  it("does not render dialog content when closed", () => {
    renderWithIntl(
      <UpiTestQrModal
        open={false}
        onOpenChange={vi.fn()}
        shopName="Star Mobile"
        upiId="starmobile@okaxis"
      />
    );

    expect(screen.queryByText("Star Mobile")).toBeNull();
  });
});
