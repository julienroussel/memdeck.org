import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { render } from "../test-utils";
import { Score } from "./score";

describe("Score", () => {
  it("renders the successes count", () => {
    render(<Score fails={2} successes={5} />);

    const successBadge = screen.getByLabelText("Correct answers: 5");
    expect(successBadge).toBeInTheDocument();
    expect(successBadge).toHaveTextContent("5");
  });

  it("renders the fails count", () => {
    render(<Score fails={7} successes={3} />);

    const failBadge = screen.getByLabelText("Incorrect answers: 7");
    expect(failBadge).toBeInTheDocument();
    expect(failBadge).toHaveTextContent("7");
  });

  it("renders zero counts when given zero values", () => {
    render(<Score fails={0} successes={0} />);

    const successBadge = screen.getByLabelText("Correct answers: 0");
    expect(successBadge).toBeInTheDocument();
    expect(successBadge).toHaveTextContent("0");

    const failBadge = screen.getByLabelText("Incorrect answers: 0");
    expect(failBadge).toBeInTheDocument();
    expect(failBadge).toHaveTextContent("0");
  });
});
