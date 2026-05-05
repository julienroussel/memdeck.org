import { Grid } from "@mantine/core";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "../../test-utils";
import type { PlayingCard } from "../../types/playingcard";
import {
  createDeckPosition,
  type PlayingCardPosition,
} from "../../types/stacks";
import { FourOfClubs, ThreeOfClubs } from "../../types/suits/clubs";
import { TwoOfHearts } from "../../types/suits/hearts";
import { AceOfSpades, FiveOfSpades } from "../../types/suits/spades";
import { FlashcardActiveRound } from "./flashcard-active-round";

const promptCard: PlayingCardPosition = {
  index: createDeckPosition(1),
  card: FourOfClubs,
};

const numberChoices: { type: "numbers"; data: number[] } = {
  type: "numbers",
  data: [1, 2, 3, 4, 5],
};

const cardChoices: { type: "cards"; data: PlayingCard[] } = {
  type: "cards",
  data: [TwoOfHearts, ThreeOfClubs, AceOfSpades, FiveOfSpades, FourOfClubs],
};

// FlashcardActiveRound emits Grid.Col children, which require a Grid ancestor
// from Mantine. Wrap every render in a Grid so the components mount cleanly.
const renderInGrid = (ui: ReactNode) => render(<Grid>{ui}</Grid>);

const TIMER_LABEL_12S = /12s$/;

describe("FlashcardActiveRound", () => {
  it("renders numeric choices when not in neighbor mode and the card is shown", () => {
    renderInGrid(
      <FlashcardActiveRound
        answerCard={promptCard}
        card={promptCard}
        cardChoices={cardChoices}
        isNeighborMode={false}
        numberChoices={numberChoices}
        onSubmitAnswer={vi.fn()}
        resolvedDirection={null}
        shouldShowCard={true}
        timeRemaining={30}
        timerDuration={30}
        timerEnabled={false}
      />
    );

    // CardSpread labels its number buttons "Select position {n}".
    expect(
      screen.getByRole("button", { name: "Select position 1" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Select position 5" })
    ).toBeInTheDocument();
    // Card-choice button labels (e.g. "3 of Clubs") must not appear here.
    expect(
      screen.queryByRole("button", { name: "3 of Clubs" })
    ).not.toBeInTheDocument();
  });

  it("renders card choices in neighbor mode regardless of shouldShowCard", () => {
    renderInGrid(
      <FlashcardActiveRound
        answerCard={promptCard}
        card={promptCard}
        cardChoices={cardChoices}
        isNeighborMode={true}
        numberChoices={numberChoices}
        onSubmitAnswer={vi.fn()}
        resolvedDirection="before"
        shouldShowCard={true}
        timeRemaining={30}
        timerDuration={30}
        timerEnabled={false}
      />
    );

    expect(
      screen.getByRole("button", { name: "3 of Clubs" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "5 of Spades" })
    ).toBeInTheDocument();
    // Numeric choice buttons must not appear in neighbor mode.
    expect(
      screen.queryByRole("button", { name: "Select position 1" })
    ).not.toBeInTheDocument();
  });

  it("renders card choices when shouldShowCard is false (index-only mode)", () => {
    renderInGrid(
      <FlashcardActiveRound
        answerCard={promptCard}
        card={promptCard}
        cardChoices={cardChoices}
        isNeighborMode={false}
        numberChoices={numberChoices}
        onSubmitAnswer={vi.fn()}
        resolvedDirection={null}
        shouldShowCard={false}
        timeRemaining={30}
        timerDuration={30}
        timerEnabled={false}
      />
    );

    // showNumberChoices is false here, so card choices render.
    expect(
      screen.getByRole("button", { name: "3 of Clubs" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Select position 1" })
    ).not.toBeInTheDocument();
  });

  it("renders the timer display when timerEnabled is true", () => {
    renderInGrid(
      <FlashcardActiveRound
        answerCard={promptCard}
        card={promptCard}
        cardChoices={cardChoices}
        isNeighborMode={false}
        numberChoices={numberChoices}
        onSubmitAnswer={vi.fn()}
        resolvedDirection={null}
        shouldShowCard={true}
        timeRemaining={12}
        timerDuration={30}
        timerEnabled={true}
      />
    );

    // TimerDisplay renders a progressbar with an aria-label that includes the
    // remaining seconds. The translation key resolves to its key string in the
    // test setup, so we match the trailing "12s" part.
    expect(
      screen.getByRole("progressbar", { name: TIMER_LABEL_12S })
    ).toBeInTheDocument();
  });

  it("does not render the timer display when timerEnabled is false", () => {
    renderInGrid(
      <FlashcardActiveRound
        answerCard={promptCard}
        card={promptCard}
        cardChoices={cardChoices}
        isNeighborMode={false}
        numberChoices={numberChoices}
        onSubmitAnswer={vi.fn()}
        resolvedDirection={null}
        shouldShowCard={true}
        timeRemaining={30}
        timerDuration={30}
        timerEnabled={false}
      />
    );

    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("calls onSubmitAnswer with the numeric value and index when a number choice is clicked", async () => {
    const onSubmitAnswer = vi.fn();
    const user = userEvent.setup();
    renderInGrid(
      <FlashcardActiveRound
        answerCard={promptCard}
        card={promptCard}
        cardChoices={cardChoices}
        isNeighborMode={false}
        numberChoices={numberChoices}
        onSubmitAnswer={onSubmitAnswer}
        resolvedDirection={null}
        shouldShowCard={true}
        timeRemaining={30}
        timerDuration={30}
        timerEnabled={false}
      />
    );

    await user.click(screen.getByRole("button", { name: "Select position 3" }));

    expect(onSubmitAnswer).toHaveBeenCalledWith(3, 2);
  });

  it("calls onSubmitAnswer with the PlayingCard and index when a card choice is clicked in neighbor mode", async () => {
    const onSubmitAnswer = vi.fn();
    const user = userEvent.setup();
    renderInGrid(
      <FlashcardActiveRound
        answerCard={promptCard}
        card={promptCard}
        cardChoices={cardChoices}
        isNeighborMode={true}
        numberChoices={numberChoices}
        onSubmitAnswer={onSubmitAnswer}
        resolvedDirection="after"
        shouldShowCard={true}
        timeRemaining={30}
        timerDuration={30}
        timerEnabled={false}
      />
    );

    await user.click(screen.getByRole("button", { name: "Ace of Spades" }));

    expect(onSubmitAnswer).toHaveBeenCalledWith(AceOfSpades, 2);
  });
});
