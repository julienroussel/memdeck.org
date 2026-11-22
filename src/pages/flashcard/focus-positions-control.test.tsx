import { fireEvent, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "../../test-utils";
import type { DeckPosition } from "../../types/stacks";
import { createDeckPosition } from "../../types/stacks";
import { FocusPositionsControl } from "./focus-positions-control";

const focusList = [23, 24, 28, 29, 30, 31, 42].map(createDeckPosition);

type HarnessProps = {
  initial: readonly DeckPosition[];
  onChange: (positions: readonly DeckPosition[]) => void;
  saves: boolean;
};

// Stands in for the stored list: a change is kept only when the save succeeds.
const Harness = ({ initial, onChange, saves }: HarnessProps) => {
  const [positions, setPositions] = useState(initial);
  const handleChange = (next: readonly DeckPosition[]) => {
    onChange(next);
    if (saves) {
      setPositions(next);
    }
  };
  return (
    <FocusPositionsControl onChange={handleChange} positions={positions} />
  );
};

const setup = (initial: readonly DeckPosition[] = [], saves = true) => {
  const onChange = vi.fn();
  render(<Harness initial={initial} onChange={onChange} saves={saves} />);
  const input = screen.getByRole("textbox", { name: "Focus positions" });
  const apply = screen.getByRole("button", { name: "Apply" });
  return { apply, input, onChange };
};

const typeAndApply = (
  input: HTMLElement,
  apply: HTMLElement,
  value: string
) => {
  fireEvent.change(input, { target: { value } });
  fireEvent.click(apply);
};

describe("FocusPositionsControl", () => {
  it("saves a valid list and shows it in its tidy form", () => {
    const { input, apply, onChange } = setup();

    typeAndApply(input, apply, "42,23,24,28-31");

    expect(onChange).toHaveBeenCalledWith(focusList);
    expect(input).toHaveValue("23, 24, 28-31, 42");
  });

  it("saves on Enter", () => {
    const { input, onChange } = setup();

    fireEvent.change(input, { target: { value: "1-5" } });
    fireEvent.submit(input);

    expect(onChange).toHaveBeenCalledWith([1, 2, 3, 4, 5]);
  });

  it("shows the current list when opened", () => {
    const { input } = setup(focusList);

    expect(input).toHaveValue("23, 24, 28-31, 42");
  });

  it("keeps what was typed when the save fails, instead of showing it as applied", () => {
    const { input, apply, onChange } = setup([], false);

    typeAndApply(input, apply, "42,23,24,28-31");

    expect(onChange).toHaveBeenCalledOnce();
    expect(input).toHaveValue("42,23,24,28-31");
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();
  });

  it("follows the stored list when it changes elsewhere", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <FocusPositionsControl onChange={onChange} positions={focusList} />
    );
    const input = screen.getByRole("textbox", { name: "Focus positions" });
    fireEvent.change(input, { target: { value: "1-9" } });

    rerender(
      <FocusPositionsControl
        onChange={onChange}
        positions={[1, 2, 3, 4, 5].map(createDeckPosition)}
      />
    );

    expect(input).toHaveValue("1-5");
  });

  it.each([
    ["1-5,abc", '"abc" isn\'t a position or a range like 28-31.'],
    ["1-5,53", "53 is outside positions 1 to 52."],
    ["1-5,31-28", "31-28 runs backwards. Try 28-31."],
    ["1-5,3", "3 is listed twice."],
    ["1,2,3", "Enter at least 5 positions."],
  ])("refuses %s with a message screen readers announce", (value, message) => {
    const { input, apply, onChange } = setup();

    typeAndApply(input, apply, value);

    expect(screen.getByRole("alert")).toHaveTextContent(message);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("drops the error as soon as the field is edited", () => {
    const { input, apply } = setup();
    typeAndApply(input, apply, "1,2,3");

    fireEvent.change(input, { target: { value: "1,2,3,4" } });

    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("clears the list when an empty field is applied", () => {
    const { input, apply, onChange } = setup(focusList);

    typeAndApply(input, apply, "");

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("does not save a list equal to the current one", () => {
    const { input, apply, onChange } = setup(focusList);

    typeAndApply(input, apply, "23,24,28,29,30,31,42");

    expect(onChange).not.toHaveBeenCalled();
    expect(input).toHaveValue("23, 24, 28-31, 42");
  });

  it("hides Clear while no list is set", () => {
    setup();
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();
  });

  it("clears the list with Clear and keeps focus in the field", () => {
    const { input, onChange } = setup(focusList);
    const clear = screen.getByRole("button", { name: "Clear" });
    clear.focus();

    fireEvent.click(clear);

    expect(onChange).toHaveBeenCalledWith([]);
    expect(input).toHaveValue("");
    expect(input).toHaveFocus();
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();
  });

  it("keeps the list and Clear when clearing fails to save", () => {
    const { input, onChange } = setup(focusList, false);
    const clear = screen.getByRole("button", { name: "Clear" });

    fireEvent.click(clear);

    expect(onChange).toHaveBeenCalledWith([]);
    expect(input).toHaveValue("23, 24, 28-31, 42");
    expect(screen.getByRole("button", { name: "Clear" })).toBeInTheDocument();
    expect(input).toHaveFocus();
  });

  it("announces the list in force, so a same-size change is announced too", () => {
    const { input, apply } = setup();

    typeAndApply(input, apply, "1-5");
    expect(screen.getByText("Focus: 5 positions · 1-5")).toHaveAttribute(
      "aria-live",
      "polite"
    );

    typeAndApply(input, apply, "6-10");
    expect(screen.getByText("Focus: 5 positions · 6-10")).toBeInTheDocument();
  });
});
