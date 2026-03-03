import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { render } from "../../test-utils";
import {
  createDeckPosition,
  type PlayingCardPosition,
} from "../../types/stacks";
import { AceOfSpades } from "../../types/suits/spades";
import { FlashcardCardDisplay } from "./flashcard-card-display";

const testCard: PlayingCardPosition = {
  index: createDeckPosition(1),
  card: AceOfSpades,
};

describe("FlashcardCardDisplay", () => {
  it("renders the card image visible when shouldShowCard is true", () => {
    render(
      <FlashcardCardDisplay
        card={testCard}
        isNeighborMode={false}
        resolvedDirection={null}
        shouldShowCard={true}
      />
    );

    const image = screen.getByAltText("Ace of Spades");
    expect(image).toHaveStyle({ visibility: "visible" });
  });

  it("renders the number card visible when shouldShowCard is false", () => {
    render(
      <FlashcardCardDisplay
        card={testCard}
        isNeighborMode={false}
        resolvedDirection={null}
        shouldShowCard={false}
      />
    );

    const numberCard = screen.getByTestId("number-card");
    expect(numberCard).toHaveStyle({ visibility: "visible" });
  });

  it("does not render chevron arrows when isNeighborMode is false", () => {
    render(
      <FlashcardCardDisplay
        card={testCard}
        isNeighborMode={false}
        resolvedDirection={null}
        shouldShowCard={true}
      />
    );

    expect(screen.queryByLabelText("Card before")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Card after")).not.toBeInTheDocument();
  });

  it("renders left chevron visible when resolvedDirection is 'before'", () => {
    render(
      <FlashcardCardDisplay
        card={testCard}
        isNeighborMode={true}
        resolvedDirection="before"
        shouldShowCard={true}
      />
    );

    const leftArrow = screen.getByLabelText("Card before");
    expect(leftArrow).toHaveStyle({ visibility: "visible" });

    const rightArrow = screen.getByLabelText("Card after");
    expect(rightArrow).toHaveStyle({ visibility: "hidden" });
  });

  it("renders right chevron visible when resolvedDirection is 'after'", () => {
    render(
      <FlashcardCardDisplay
        card={testCard}
        isNeighborMode={true}
        resolvedDirection="after"
        shouldShowCard={true}
      />
    );

    const rightArrow = screen.getByLabelText("Card after");
    expect(rightArrow).toHaveStyle({ visibility: "visible" });

    const leftArrow = screen.getByLabelText("Card before");
    expect(leftArrow).toHaveStyle({ visibility: "hidden" });
  });

  it("sets aria-hidden on the inactive chevron for 'before' direction", () => {
    render(
      <FlashcardCardDisplay
        card={testCard}
        isNeighborMode={true}
        resolvedDirection="before"
        shouldShowCard={true}
      />
    );

    const leftArrow = screen.getByLabelText("Card before");
    expect(leftArrow).not.toHaveAttribute("aria-hidden");

    const rightArrow = screen.getByLabelText("Card after");
    expect(rightArrow).toHaveAttribute("aria-hidden", "true");
  });

  it("sets aria-hidden on the inactive chevron for 'after' direction", () => {
    render(
      <FlashcardCardDisplay
        card={testCard}
        isNeighborMode={true}
        resolvedDirection="after"
        shouldShowCard={true}
      />
    );

    const rightArrow = screen.getByLabelText("Card after");
    expect(rightArrow).not.toHaveAttribute("aria-hidden");

    const leftArrow = screen.getByLabelText("Card before");
    expect(leftArrow).toHaveAttribute("aria-hidden", "true");
  });

  it("hides both chevrons when isNeighborMode is true but resolvedDirection is null", () => {
    render(
      <FlashcardCardDisplay
        card={testCard}
        isNeighborMode={true}
        resolvedDirection={null}
        shouldShowCard={true}
      />
    );

    const leftArrow = screen.getByLabelText("Card before");
    expect(leftArrow).toHaveStyle({ visibility: "hidden" });
    expect(leftArrow).toHaveAttribute("aria-hidden", "true");

    const rightArrow = screen.getByLabelText("Card after");
    expect(rightArrow).toHaveStyle({ visibility: "hidden" });
    expect(rightArrow).toHaveAttribute("aria-hidden", "true");
  });

  it("sets aria-hidden on hidden card image when shouldShowCard is false", () => {
    render(
      <FlashcardCardDisplay
        card={testCard}
        isNeighborMode={false}
        resolvedDirection={null}
        shouldShowCard={false}
      />
    );

    const image = screen.getByAltText("Ace of Spades");
    expect(image.closest("[aria-hidden]")).toHaveAttribute(
      "aria-hidden",
      "true"
    );
  });

  it("sets aria-hidden on hidden number card when shouldShowCard is true", () => {
    render(
      <FlashcardCardDisplay
        card={testCard}
        isNeighborMode={false}
        resolvedDirection={null}
        shouldShowCard={true}
      />
    );

    const numberCard = screen.getByTestId("number-card");
    expect(numberCard.closest("[aria-hidden]")).toHaveAttribute(
      "aria-hidden",
      "true"
    );
  });
});
