import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ROUTES } from "../constants";
import { render } from "../test-utils";
import { RequireStack } from "./require-stack";

const mockUseSelectedStack = vi.fn();
vi.mock("../hooks/use-selected-stack", () => ({
  useSelectedStack: () => mockUseSelectedStack(),
}));

const DESCRIPTION_KEY = "flashcard.pageDescription";
const DESCRIPTION_TEXT =
  "Practice your memorized deck with interactive flashcard drills. Train card-to-number, number-to-card, or both.";
const NO_STACK_TEXT = "Pick a stack on the homepage to get started.";

describe("RequireStack", () => {
  it("renders children when a stack is selected", () => {
    mockUseSelectedStack.mockReturnValue({ stackKey: "mnemonica" });

    render(
      <RequireStack descriptionKey={DESCRIPTION_KEY}>
        <div>protected content</div>
      </RequireStack>
    );

    expect(screen.getByText("protected content")).toBeInTheDocument();
    expect(screen.queryByText(NO_STACK_TEXT)).not.toBeInTheDocument();
  });

  it("renders the no-stack message instead of children when no stack is selected", () => {
    mockUseSelectedStack.mockReturnValue({ stackKey: "" });

    render(
      <RequireStack descriptionKey={DESCRIPTION_KEY}>
        <div>protected content</div>
      </RequireStack>
    );

    expect(screen.queryByText("protected content")).not.toBeInTheDocument();
    expect(screen.getByText(NO_STACK_TEXT)).toBeInTheDocument();
    expect(screen.getByText(DESCRIPTION_TEXT)).toBeInTheDocument();
  });

  it("links to the homepage when no stack is selected", () => {
    mockUseSelectedStack.mockReturnValue({ stackKey: "" });

    render(
      <RequireStack descriptionKey={DESCRIPTION_KEY}>
        <div>protected content</div>
      </RequireStack>
    );

    const link = screen.getByRole("link", { name: "Go to homepage" });
    expect(link).toHaveAttribute("href", ROUTES.home);
  });
});
