import { screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SELECTED_STACK_LSK } from "../../constants";
import { render } from "../../test-utils";
import { GettingStarted } from "./getting-started";

describe("GettingStarted", () => {
  beforeEach(() => {
    localStorage.setItem(SELECTED_STACK_LSK, JSON.stringify("mnemonica"));
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("renders the selected stack as named card images, not buttons", () => {
    render(<GettingStarted />);

    const spread = screen.getByRole("group", { name: "Card spread" });
    expect(within(spread).queryAllByRole("button")).toHaveLength(0);
    expect(within(spread).getAllByRole("img")).toHaveLength(52);
    expect(
      within(spread).getByRole("img", { name: "Four of Clubs" })
    ).toBeInTheDocument();
  });

  it("adds a single tab stop for the spread", () => {
    render(<GettingStarted />);

    const spread = screen.getByRole("group", { name: "Card spread" });
    expect(spread).toHaveAttribute("tabIndex", "0");
  });
});
