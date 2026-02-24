import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { render } from "../../test-utils";
import { stacks } from "../../types/stacks";
import { computeSequences } from "./compute-sequences";
import { StayStack } from "./stay-stack";

vi.mock("../../hooks/use-selected-stack", () => ({
  useRequiredStack: () => ({
    stackKey: "mnemonica" as const,
    stack: stacks.mnemonica,
    stackOrder: stacks.mnemonica.order,
    stackName: stacks.mnemonica.name,
  }),
}));

const DEFAULT_STEP = 2;

describe("StayStack", () => {
  it("renders the step input with default value of 2", () => {
    render(<StayStack />);

    const input = screen.getByRole("textbox", { name: "Step size" });
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue("2");
  });

  it("displays the cycle summary text", () => {
    const result = computeSequences(stacks.mnemonica.order, DEFAULT_STEP);

    render(<StayStack />);

    const matches = screen.getAllByText(
      `${result.cycleCount} cycles of ${result.cycleLength} cards each`
    );
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("renders the correct number of cycle tables for the default step", () => {
    const result = computeSequences(stacks.mnemonica.order, DEFAULT_STEP);

    render(<StayStack />);

    const tables = screen.getAllByRole("table");
    expect(tables).toHaveLength(result.cycleCount);
  });

  it("renders cycle label headers on each table", () => {
    const result = computeSequences(stacks.mnemonica.order, DEFAULT_STEP);

    render(<StayStack />);

    for (let i = 0; i < result.cycleCount; i++) {
      const label = `Cycle ${i + 1} of ${result.cycleCount}`;
      expect(screen.getByRole("table", { name: label })).toBeInTheDocument();
    }
  });

  it("renders position and card column headers in each table", () => {
    const result = computeSequences(stacks.mnemonica.order, DEFAULT_STEP);

    render(<StayStack />);

    const tables = screen.getAllByRole("table");
    for (const table of tables) {
      const columnHeaders = within(table).getAllByRole("columnheader");
      const headerTexts = columnHeaders.map((h) => h.textContent);
      expect(headerTexts).toContain("#");
      expect(headerTexts).toContain("Card");
    }

    expect(tables).toHaveLength(result.cycleCount);
  });

  it("renders the correct number of card rows across all tables", () => {
    render(<StayStack />);

    const tables = screen.getAllByRole("table");
    let totalRows = 0;
    for (const table of tables) {
      const rows = within(table).getAllByRole("row");
      // Subtract 2 header rows (cycle label row + column header row)
      totalRows += rows.length - 2;
    }

    expect(totalRows).toBe(52);
  });
});
