import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "../test-utils";
import { aronson } from "../types/stacks/aronson";
import { mnemonica } from "../types/stacks/mnemonica";
import { StackPicker } from "./stack-picker";

// vi.hoisted runs before vi.mock hoisting, so these are safe to reference in factories
const { mockUseSelectedStack, mockEmitStackSelected } = vi.hoisted(() => ({
  mockUseSelectedStack: vi.fn(),
  mockEmitStackSelected: vi.fn(),
}));

vi.mock("../hooks/use-selected-stack", () => ({
  useSelectedStack: mockUseSelectedStack,
}));

vi.mock("../services/event-bus", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/event-bus")>();
  return {
    eventBus: {
      ...actual.eventBus,
      emit: {
        ...actual.eventBus.emit,
        STACK_SELECTED: mockEmitStackSelected,
      },
    },
  };
});

const makeNoStackResult = () => ({
  stackKey: "" as const,
  stack: null,
  stackOrder: null,
  stackName: null,
  setStackKey: vi.fn(),
});

describe("StackPicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSelectedStack.mockReturnValue(makeNoStackResult());
  });

  describe("rendering", () => {
    it("renders a select element with the correct aria-label", () => {
      render(<StackPicker />);

      const select = screen.getByRole("combobox", {
        name: "Select memorized deck",
      });
      expect(select).toBeInTheDocument();
    });

    it("renders all available stack options", () => {
      render(<StackPicker />);

      // Stack display names come from each stack's `name` property, not the key.
      // mnemonica -> "Tamariz", redford -> "Redford Stack"
      expect(
        screen.getByRole("option", { name: "Aronson" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: "Elephant" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: "Memorandum" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: "Tamariz" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: "Particle System" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: "Redford Stack" })
      ).toBeInTheDocument();
    });

    it("renders a placeholder option when no stack is selected", () => {
      render(<StackPicker />);

      const placeholder = screen.getByRole("option", {
        name: "Please choose a stack",
      });
      expect(placeholder).toBeInTheDocument();
    });

    it("does not render a placeholder option when a stack is already selected", () => {
      mockUseSelectedStack.mockReturnValue({
        stackKey: "mnemonica",
        stack: mnemonica,
        stackOrder: mnemonica.order,
        stackName: "Tamariz",
        setStackKey: vi.fn(),
      });

      render(<StackPicker />);

      const placeholder = screen.queryByRole("option", {
        name: "Please choose a stack",
      });
      expect(placeholder).not.toBeInTheDocument();
    });

    it("shows the currently selected stack value", () => {
      mockUseSelectedStack.mockReturnValue({
        stackKey: "aronson",
        stack: aronson,
        stackOrder: aronson.order,
        stackName: "Aronson",
        setStackKey: vi.fn(),
      });

      render(<StackPicker />);

      const select = screen.getByRole("combobox", {
        name: "Select memorized deck",
      });
      expect(select).toHaveValue("aronson");
    });
  });

  describe("selection changes", () => {
    it("calls setStackKey when user selects a different stack", () => {
      const mockSetStackKey = vi.fn();
      mockUseSelectedStack.mockReturnValue({
        ...makeNoStackResult(),
        setStackKey: mockSetStackKey,
      });

      render(<StackPicker />);

      const select = screen.getByRole("combobox", {
        name: "Select memorized deck",
      });
      fireEvent.change(select, { target: { value: "mnemonica" } });

      expect(mockSetStackKey).toHaveBeenCalledWith("mnemonica");
    });

    it("emits STACK_SELECTED event with stack name when a valid stack is selected", () => {
      render(<StackPicker />);

      const select = screen.getByRole("combobox", {
        name: "Select memorized deck",
      });
      // The mnemonica key maps to display name "Tamariz"
      fireEvent.change(select, { target: { value: "mnemonica" } });

      expect(mockEmitStackSelected).toHaveBeenCalledWith({
        stackName: "Tamariz",
      });
    });

    it("emits STACK_SELECTED event with the correct name for the aronson stack", () => {
      render(<StackPicker />);

      const select = screen.getByRole("combobox", {
        name: "Select memorized deck",
      });
      fireEvent.change(select, { target: { value: "aronson" } });

      expect(mockEmitStackSelected).toHaveBeenCalledWith({
        stackName: "Aronson",
      });
    });

    it("emits STACK_SELECTED event with the correct name for the elephant stack", () => {
      render(<StackPicker />);

      const select = screen.getByRole("combobox", {
        name: "Select memorized deck",
      });
      fireEvent.change(select, { target: { value: "elephant" } });

      expect(mockEmitStackSelected).toHaveBeenCalledWith({
        stackName: "Elephant",
      });
    });

    it("does not emit STACK_SELECTED when empty value is selected", () => {
      render(<StackPicker />);

      const select = screen.getByRole("combobox", {
        name: "Select memorized deck",
      });
      fireEvent.change(select, { target: { value: "" } });

      expect(mockEmitStackSelected).not.toHaveBeenCalled();
    });

    it("still calls setStackKey even when empty value is selected", () => {
      const mockSetStackKey = vi.fn();
      mockUseSelectedStack.mockReturnValue({
        ...makeNoStackResult(),
        setStackKey: mockSetStackKey,
      });

      render(<StackPicker />);

      const select = screen.getByRole("combobox", {
        name: "Select memorized deck",
      });
      fireEvent.change(select, { target: { value: "" } });

      expect(mockSetStackKey).toHaveBeenCalledWith("");
    });
  });

  describe("memoization", () => {
    it("renders without crashing when re-rendered with the same props", () => {
      const { rerender } = render(<StackPicker />);

      rerender(<StackPicker />);

      const select = screen.getByRole("combobox", {
        name: "Select memorized deck",
      });
      expect(select).toBeInTheDocument();
    });
  });
});
