import { Grid } from "@mantine/core";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "../../test-utils";
import {
  createDeckPosition,
  type PlayingCardPosition,
} from "../../types/stacks";
import { FourOfClubs, ThreeOfClubs } from "../../types/suits/clubs";
import { TwoOfHearts } from "../../types/suits/hearts";
import { AceOfSpades, FiveOfSpades } from "../../types/suits/spades";
import type { TimerSettings } from "../../types/timer";
import type { CardSpreadProps } from "../../types/typeguards";
import { DistanceActiveRound } from "./distance-active-round";
import type { PlayableDistanceRound } from "./distance-game-reducer";

const SELECT_POSITION_REGEX = /Select position/;

// Count CardSpread renders while keeping the real component, so these tests
// still click real buttons.
const cardSpreadRenders = vi.hoisted(() => ({ count: 0 }));
vi.mock("../../components/card-spread/card-spread", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("../../components/card-spread/card-spread")
    >();
  const { memo } = await import("react");
  const CountedCardSpread = memo((props: CardSpreadProps) => {
    cardSpreadRenders.count += 1;
    return <actual.CardSpread {...props} />;
  });
  return { CardSpread: CountedCardSpread };
});

const promptCard: PlayingCardPosition = {
  card: FourOfClubs,
  index: createDeckPosition(1),
};

const answerCard: PlayingCardPosition = {
  card: TwoOfHearts,
  index: createDeckPosition(2),
};

const cardChoiceA: PlayingCardPosition = {
  card: ThreeOfClubs,
  index: createDeckPosition(3),
};
const cardChoiceB: PlayingCardPosition = {
  card: AceOfSpades,
  index: createDeckPosition(4),
};
const cardChoiceC: PlayingCardPosition = {
  card: FiveOfSpades,
  index: createDeckPosition(5),
};

const computeRound: PlayableDistanceRound = {
  answerCard,
  choices: { data: [1, 2, 3, 4, 5], kind: "numbers" },
  display: "compute",
  expectedDistance: 3,
  offset: null,
};

const applyRound: PlayableDistanceRound = {
  answerCard,
  choices: {
    data: [answerCard, cardChoiceA, cardChoiceB, cardChoiceC, promptCard],
    kind: "cards",
  },
  display: "apply",
  expectedDistance: null,
  offset: 5,
};

const noTimerSettings: TimerSettings = { duration: 30, enabled: false };

// DistanceActiveRound emits Grid.Col children, which require a Grid ancestor
// from Mantine. Wrap every render in a Grid so the components mount cleanly.
const renderInGrid = (ui: ReactNode) => render(<Grid>{ui}</Grid>);

describe("DistanceActiveRound — compute round", () => {
  it("renders the compute prompt (both card images visible)", () => {
    renderInGrid(
      <DistanceActiveRound
        card={promptCard}
        round={computeRound}
        roundConvention="cyclic"
        submitAnswer={vi.fn()}
        timeRemaining={30}
        timerDuration={30}
        timerSettings={noTimerSettings}
      />
    );
    // The compute branch of DistancePromptDisplay renders both prompt and
    // target card images with these test ids.
    expect(screen.getByTestId("distance-prompt-card")).toBeInTheDocument();
    expect(screen.getByTestId("distance-target-card")).toBeInTheDocument();
    // No offset badge in compute mode.
    expect(
      screen.queryByTestId("distance-offset-badge")
    ).not.toBeInTheDocument();
  });

  it("clicking a numeric choice calls submitAnswer with kind=compute and the numeric value", async () => {
    const submitAnswer = vi.fn();
    const user = userEvent.setup();
    renderInGrid(
      <DistanceActiveRound
        card={promptCard}
        round={computeRound}
        roundConvention="cyclic"
        submitAnswer={submitAnswer}
        timeRemaining={30}
        timerDuration={30}
        timerSettings={noTimerSettings}
      />
    );

    // Compute-round number buttons are named "Select distance {n}".
    await user.click(screen.getByRole("button", { name: "Select distance 3" }));

    expect(submitAnswer).toHaveBeenCalledWith({ kind: "compute", value: 3 });
  });

  it("names a negative signed choice as a distance with its sign", async () => {
    const submitAnswer = vi.fn();
    const user = userEvent.setup();
    renderInGrid(
      <DistanceActiveRound
        card={promptCard}
        round={{
          ...computeRound,
          choices: { data: [-3, -1, 1, 2, 3], kind: "numbers" },
          expectedDistance: -3,
        }}
        roundConvention="signed"
        submitAnswer={submitAnswer}
        timeRemaining={30}
        timerDuration={30}
        timerSettings={noTimerSettings}
      />
    );

    expect(
      screen.queryByRole("button", { name: SELECT_POSITION_REGEX })
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Select distance -3" })
    );

    expect(submitAnswer).toHaveBeenCalledWith({ kind: "compute", value: -3 });
  });
});

describe("DistanceActiveRound — apply round", () => {
  it("renders the apply prompt (offset badge visible, no target card image)", () => {
    renderInGrid(
      <DistanceActiveRound
        card={promptCard}
        round={applyRound}
        roundConvention="cyclic"
        submitAnswer={vi.fn()}
        timeRemaining={30}
        timerDuration={30}
        timerSettings={noTimerSettings}
      />
    );
    expect(screen.getByTestId("distance-prompt-card")).toBeInTheDocument();
    expect(
      screen.queryByTestId("distance-target-card")
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("distance-offset-badge")).toBeInTheDocument();
  });

  it("clicking a card choice calls submitAnswer with kind=apply and the PlayingCard", async () => {
    const submitAnswer = vi.fn();
    const user = userEvent.setup();
    renderInGrid(
      <DistanceActiveRound
        card={promptCard}
        round={applyRound}
        roundConvention="cyclic"
        submitAnswer={submitAnswer}
        timeRemaining={30}
        timerDuration={30}
        timerSettings={noTimerSettings}
      />
    );

    await user.click(screen.getByRole("button", { name: "Two of Hearts" }));

    expect(submitAnswer).toHaveBeenCalledWith({
      kind: "apply",
      value: TwoOfHearts,
    });
  });
});

describe("DistanceActiveRound — live region after a wrong pick", () => {
  // A wrong pick keeps the same round open, so the announcement must not
  // hand screen-reader users the answer.
  const getLiveRegion = (container: HTMLElement) => {
    const region = container.querySelector('[aria-live="polite"]');
    if (!region) {
      throw new Error("Expected a polite live region");
    }
    return region;
  };

  it("announces try-again without the expected distance in a compute round", async () => {
    const user = userEvent.setup();
    const { container } = renderInGrid(
      <DistanceActiveRound
        card={promptCard}
        round={computeRound}
        roundConvention="cyclic"
        submitAnswer={vi.fn()}
        timeRemaining={30}
        timerDuration={30}
        timerSettings={noTimerSettings}
      />
    );

    await user.click(screen.getByRole("button", { name: "Select distance 1" }));

    const text = getLiveRegion(container).textContent ?? "";
    expect(text).toContain("Wrong answer. Try again!");
    // The expected distance is 3.
    expect(text).not.toContain("3");
  });

  it("announces try-again without the answer card in an apply round", async () => {
    const user = userEvent.setup();
    const { container } = renderInGrid(
      <DistanceActiveRound
        card={promptCard}
        round={applyRound}
        roundConvention="cyclic"
        submitAnswer={vi.fn()}
        timeRemaining={30}
        timerDuration={30}
        timerSettings={noTimerSettings}
      />
    );

    await user.click(screen.getByRole("button", { name: "Three of Clubs" }));

    const text = getLiveRegion(container).textContent ?? "";
    expect(text).toContain("Wrong answer. Try again!");
    expect(text).not.toContain("Two of Hearts");
  });

  it("still announces Correct for a right pick", async () => {
    const user = userEvent.setup();
    const { container } = renderInGrid(
      <DistanceActiveRound
        card={promptCard}
        round={computeRound}
        roundConvention="cyclic"
        submitAnswer={vi.fn()}
        timeRemaining={30}
        timerDuration={30}
        timerSettings={noTimerSettings}
      />
    );

    await user.click(screen.getByRole("button", { name: "Select distance 3" }));

    expect(getLiveRegion(container).textContent).toContain("Correct");
  });
});

describe("DistanceActiveRound — timer ticks", () => {
  const timerSettings: TimerSettings = { duration: 30, enabled: true };

  it("does not re-render CardSpread when a TICK only changes timeRemaining", () => {
    const submitAnswer = vi.fn();
    const { rerender } = renderInGrid(
      <DistanceActiveRound
        card={promptCard}
        round={computeRound}
        roundConvention="cyclic"
        submitAnswer={submitAnswer}
        timeRemaining={30}
        timerDuration={30}
        timerSettings={timerSettings}
      />
    );
    const rendersBeforeTick = cardSpreadRenders.count;

    // A TICK spreads the reducer state, so `round` is a new object whose
    // fields keep their identity.
    rerender(
      <Grid>
        <DistanceActiveRound
          card={promptCard}
          round={{ ...computeRound }}
          roundConvention="cyclic"
          submitAnswer={submitAnswer}
          timeRemaining={29}
          timerDuration={30}
          timerSettings={timerSettings}
        />
      </Grid>
    );

    expect(cardSpreadRenders.count).toBe(rendersBeforeTick);
  });

  it("does not re-render the apply-round CardSpread when a TICK only changes timeRemaining", () => {
    const submitAnswer = vi.fn();
    const { rerender } = renderInGrid(
      <DistanceActiveRound
        card={promptCard}
        round={applyRound}
        roundConvention="cyclic"
        submitAnswer={submitAnswer}
        timeRemaining={30}
        timerDuration={30}
        timerSettings={timerSettings}
      />
    );
    const rendersBeforeTick = cardSpreadRenders.count;

    rerender(
      <Grid>
        <DistanceActiveRound
          card={promptCard}
          round={{ ...applyRound }}
          roundConvention="cyclic"
          submitAnswer={submitAnswer}
          timeRemaining={29}
          timerDuration={30}
          timerSettings={timerSettings}
        />
      </Grid>
    );

    expect(cardSpreadRenders.count).toBe(rendersBeforeTick);
  });
});
