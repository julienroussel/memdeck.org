import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  DECK_SIZE,
  MIN_FLASHCARD_RANGE,
  MIN_SPOT_CHECK_RANGE,
} from "../constants";
import { useStackLimits } from "../hooks/use-stack-limits";
import { render } from "../test-utils";
import { createDeckPosition } from "../types/stacks";
import { StackRangeBadge } from "./stack-range-badge";

vi.mock("../hooks/use-stack-limits", () => ({
  useStackLimits: vi.fn(),
}));

vi.mock("../services/event-bus", () => ({
  eventBus: {
    emit: { STACK_LIMITS_CHANGED: vi.fn() },
    subscribe: {},
  },
}));

const mockUseStackLimits = vi.mocked(useStackLimits);

const fullDeckResult = {
  limits: {
    start: createDeckPosition(1),
    end: createDeckPosition(DECK_SIZE),
  },
  setLimits: vi.fn(),
  rangeSize: DECK_SIZE,
  isFullDeck: true,
};

const partialResult = {
  limits: {
    start: createDeckPosition(1),
    end: createDeckPosition(20),
  },
  setLimits: vi.fn(),
  rangeSize: 20,
  isFullDeck: false,
};

const smallRangeResult = {
  limits: {
    start: createDeckPosition(1),
    end: createDeckPosition(MIN_FLASHCARD_RANGE),
  },
  setLimits: vi.fn(),
  rangeSize: MIN_FLASHCARD_RANGE,
  isFullDeck: false,
};

describe("StackRangeBadge", () => {
  it("shows full-deck label when limits are default", () => {
    mockUseStackLimits.mockReturnValue(fullDeckResult);

    render(<StackRangeBadge stackKey="mnemonica" stackName="Mnemonica" />);

    const button = screen.getByRole("button", {
      name: `Stack range: ${DECK_SIZE} cards. Tap to adjust.`,
    });
    expect(button).toHaveTextContent("52 cards");
  });

  it("shows partial range label when limits are custom", () => {
    mockUseStackLimits.mockReturnValue(partialResult);

    render(<StackRangeBadge stackKey="mnemonica" stackName="Mnemonica" />);

    const button = screen.getByRole("button", {
      name: "Stack range: positions 1 to 20. Tap to adjust.",
    });
    expect(button).toHaveTextContent("1–20");
  });

  it("shows orange hint text when range is very small", async () => {
    const user = userEvent.setup();
    mockUseStackLimits.mockReturnValue(smallRangeResult);

    render(<StackRangeBadge stackKey="mnemonica" stackName="Mnemonica" />);

    await user.click(
      screen.getByRole("button", {
        name: `Stack range: positions 1 to ${MIN_FLASHCARD_RANGE}. Tap to adjust.`,
      })
    );

    expect(
      screen.getByText(
        `Spot Check works best with ${MIN_SPOT_CHECK_RANGE}+ cards.`
      )
    ).toBeInTheDocument();
  });

  it("does not show orange hint text when range is large enough", async () => {
    const user = userEvent.setup();
    mockUseStackLimits.mockReturnValue({
      ...partialResult,
      rangeSize: MIN_SPOT_CHECK_RANGE,
    });

    render(<StackRangeBadge stackKey="mnemonica" stackName="Mnemonica" />);

    await user.click(
      screen.getByRole("button", {
        name: "Stack range: positions 1 to 20. Tap to adjust.",
      })
    );

    expect(
      screen.queryByText(
        `Spot Check works best with ${MIN_SPOT_CHECK_RANGE}+ cards.`
      )
    ).not.toBeInTheDocument();
  });

  it("calls setLimits when a preset button inside the modal is clicked", async () => {
    const setLimitsMock = vi.fn();
    mockUseStackLimits.mockReturnValue({
      ...fullDeckResult,
      setLimits: setLimitsMock,
    });
    const user = userEvent.setup();

    render(<StackRangeBadge stackKey="mnemonica" stackName="Mnemonica" />);

    await user.click(
      screen.getByRole("button", {
        name: `Stack range: ${DECK_SIZE} cards. Tap to adjust.`,
      })
    );

    await user.click(
      screen.getByRole("button", { name: "Set range to first 13 cards" })
    );

    expect(setLimitsMock).toHaveBeenCalledWith({
      start: createDeckPosition(1),
      end: createDeckPosition(13),
    });
  });
});
