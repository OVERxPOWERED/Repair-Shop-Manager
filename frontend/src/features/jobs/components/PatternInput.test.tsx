import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { IntlProvider } from "@/i18n/IntlProvider";
import { PatternInput } from "./PatternInput";

function renderWithIntl(ui: React.ReactElement) {
  return render(<IntlProvider>{ui}</IntlProvider>);
}

describe("PatternInput", () => {
  it("renders all 9 pattern nodes in the 3x3 grid", () => {
    const { container } = renderWithIntl(
      <PatternInput onChange={vi.fn()} />
    );

    // There should be 9 group elements with dot IDs
    const dots = container.querySelectorAll("g[class*='transition-transform']");
    expect(dots).toHaveLength(9);
  });

  it("renders connected pattern nodes and step badges when value is passed", () => {
    const { container } = renderWithIntl(
      <PatternInput value="1-2-3-6-9" onChange={vi.fn()} />
    );

    // Step numbers 1, 2, 3, 4, 5 rendered as text elements
    const texts = container.querySelectorAll("text");
    expect(texts).toHaveLength(5);
    expect(texts[0].textContent).toBe("1");
    expect(texts[1].textContent).toBe("2");
    expect(texts[4].textContent).toBe("5");

    // Clear button should be visible when pattern is drawn
    const clearBtn = screen.getByRole("button");
    expect(clearBtn).toBeDefined();
  });

  it("clears pattern when clear button is clicked", () => {
    const handleChange = vi.fn();
    renderWithIntl(
      <PatternInput value="1-2-5" onChange={handleChange} />
    );

    const clearBtn = screen.getByRole("button");
    fireEvent.click(clearBtn);

    expect(handleChange).toHaveBeenCalledWith("");
  });
});
