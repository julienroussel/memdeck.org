import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { render } from "../test-utils";
import { RevealButton } from "./reveal-button";

const REVEAL_BUTTON_NAME = /reveal/i;

describe("RevealButton", () => {
  it("renders the reveal button", () => {
    render(<RevealButton onReveal={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: REVEAL_BUTTON_NAME })
    ).toBeInTheDocument();
  });

  it("calls onReveal when clicked", async () => {
    const user = userEvent.setup();
    const onReveal = vi.fn();

    render(<RevealButton onReveal={onReveal} />);

    await user.click(screen.getByRole("button", { name: REVEAL_BUTTON_NAME }));

    expect(onReveal).toHaveBeenCalledOnce();
  });
});
