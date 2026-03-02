import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { render } from "../../test-utils";
import {
  AceOfHearts,
  FiveOfHearts,
  FourOfHearts,
  SixOfHearts,
  ThreeOfHearts,
  TwoOfHearts,
} from "../../types/suits/hearts";
import { cardItems, numberItems } from "../../types/typeguards";
import { CardSpread } from "./card-spread";

describe("CardSpread", () => {
  describe("Card items", () => {
    it("renders card items with correct aria-labels", () => {
      const cards = [AceOfHearts, TwoOfHearts, ThreeOfHearts];
      render(<CardSpread items={cardItems(cards)} />);

      expect(screen.getByLabelText("Ace of Hearts")).toBeInTheDocument();
      expect(screen.getByLabelText("2 of Hearts")).toBeInTheDocument();
      expect(screen.getByLabelText("3 of Hearts")).toBeInTheDocument();
    });

    it("clicking a card item calls onItemClick with correct card and index", () => {
      const cards = [AceOfHearts, TwoOfHearts, ThreeOfHearts];
      const handleClick = vi.fn();
      render(<CardSpread items={cardItems(cards)} onItemClick={handleClick} />);

      const secondCard = screen.getByLabelText("2 of Hearts");
      fireEvent.click(secondCard);

      expect(handleClick).toHaveBeenCalledOnce();
      expect(handleClick).toHaveBeenCalledWith(TwoOfHearts, 1);
    });

    it("clicking multiple cards calls onItemClick with correct cards and indices", () => {
      const cards = [AceOfHearts, TwoOfHearts, ThreeOfHearts];
      const handleClick = vi.fn();
      render(<CardSpread items={cardItems(cards)} onItemClick={handleClick} />);

      fireEvent.click(screen.getByLabelText("Ace of Hearts"));
      expect(handleClick).toHaveBeenCalledWith(AceOfHearts, 0);

      fireEvent.click(screen.getByLabelText("3 of Hearts"));
      expect(handleClick).toHaveBeenCalledWith(ThreeOfHearts, 2);

      expect(handleClick).toHaveBeenCalledTimes(2);
    });
  });

  describe("Number items", () => {
    it("renders number items with correct aria-labels", () => {
      const numbers = [1, 5, 10];
      render(<CardSpread items={numberItems(numbers)} />);

      expect(screen.getByLabelText("Select position 1")).toBeInTheDocument();
      expect(screen.getByLabelText("Select position 5")).toBeInTheDocument();
      expect(screen.getByLabelText("Select position 10")).toBeInTheDocument();
    });

    it("clicking a number item calls onItemClick with correct number and index", () => {
      const numbers = [1, 5, 10];
      const handleClick = vi.fn();
      render(
        <CardSpread items={numberItems(numbers)} onItemClick={handleClick} />
      );

      const secondNumber = screen.getByLabelText("Select position 5");
      fireEvent.click(secondNumber);

      expect(handleClick).toHaveBeenCalledOnce();
      expect(handleClick).toHaveBeenCalledWith(5, 1);
    });

    it("clicking multiple numbers calls onItemClick with correct numbers and indices", () => {
      const numbers = [1, 5, 10];
      const handleClick = vi.fn();
      render(
        <CardSpread items={numberItems(numbers)} onItemClick={handleClick} />
      );

      fireEvent.click(screen.getByLabelText("Select position 1"));
      expect(handleClick).toHaveBeenCalledWith(1, 0);

      fireEvent.click(screen.getByLabelText("Select position 10"));
      expect(handleClick).toHaveBeenCalledWith(10, 2);

      expect(handleClick).toHaveBeenCalledTimes(2);
    });
  });

  describe("Accessibility and structure", () => {
    it("renders a listbox with option roles", () => {
      const cards = [AceOfHearts, TwoOfHearts];
      render(<CardSpread items={cardItems(cards)} />);

      const listbox = screen.getByRole("listbox");
      expect(listbox).toBeInTheDocument();
      expect(listbox).toHaveAttribute(
        "aria-label",
        "Card spread - use arrow keys to navigate"
      );

      const options = screen.getAllByRole("option");
      expect(options).toHaveLength(2);

      for (const option of options) {
        expect(option).toHaveAttribute("aria-selected", "false");
      }
    });

    it("when canMove=false, the listbox is not focusable", () => {
      const cards = [AceOfHearts, TwoOfHearts];
      render(<CardSpread canMove={false} items={cardItems(cards)} />);

      const listbox = screen.getByRole("listbox");
      expect(listbox).not.toHaveAttribute("tabIndex");
    });

    it("when canMove=true, the listbox is focusable", () => {
      const cards = [AceOfHearts, TwoOfHearts];
      render(<CardSpread canMove={true} items={cardItems(cards)} />);

      const listbox = screen.getByRole("listbox");
      expect(listbox).toHaveAttribute("tabIndex", "0");
    });

    it("when canMove is not specified, the listbox is focusable by default", () => {
      const cards = [AceOfHearts, TwoOfHearts];
      render(<CardSpread items={cardItems(cards)} />);

      const listbox = screen.getByRole("listbox");
      expect(listbox).toHaveAttribute("tabIndex", "0");
    });
  });

  describe("Keyboard navigation", () => {
    // The component tracks an `offset` value that shifts all cards visually.
    // Each card receives a CSS custom property `--i` computed as:
    //   index + 1 - (items.length / 2) + offset
    // ArrowRight increases offset by KEYBOARD_STEP (3), ArrowLeft decreases it.
    // maxOffset = items.length / 2. Using 6 cards: maxOffset = 3, KEYBOARD_STEP = 3.
    // Initial offset = 0, so card[0] --i = 0 + 1 - 3 + 0 = -2.
    // After ArrowRight: offset = 3, card[0] --i = 1.
    // After ArrowLeft: offset = -3, card[0] --i = -5.

    const sixUniqueCards = [
      AceOfHearts,
      TwoOfHearts,
      ThreeOfHearts,
      FourOfHearts,
      FiveOfHearts,
      SixOfHearts,
    ];

    const getFirstOption = () => {
      const options = screen.getAllByRole("option");
      const first = options[0];
      if (!first) {
        throw new Error("Expected at least one option element");
      }
      return first;
    };

    const getCssVar = (el: HTMLElement, name: string) =>
      el.style.getPropertyValue(name);

    it("ArrowRight increases the offset, shifting card CSS positions forward", () => {
      render(<CardSpread items={cardItems(sixUniqueCards)} />);

      const listbox = screen.getByRole("listbox");
      const firstCard = getFirstOption();

      expect(getCssVar(firstCard, "--i")).toBe("-2");

      fireEvent.keyDown(listbox, { key: "ArrowRight" });

      expect(getCssVar(firstCard, "--i")).toBe("1");
    });

    it("ArrowLeft decreases the offset, shifting card CSS positions backward", () => {
      render(<CardSpread items={cardItems(sixUniqueCards)} />);

      const listbox = screen.getByRole("listbox");
      const firstCard = getFirstOption();

      expect(getCssVar(firstCard, "--i")).toBe("-2");

      fireEvent.keyDown(listbox, { key: "ArrowLeft" });

      expect(getCssVar(firstCard, "--i")).toBe("-5");
    });

    it("ArrowRight clamps at the maximum offset and stops changing", () => {
      render(<CardSpread items={cardItems(sixUniqueCards)} />);

      const listbox = screen.getByRole("listbox");
      const firstCard = getFirstOption();

      // One press reaches maxOffset (3 === KEYBOARD_STEP for 6 cards).
      fireEvent.keyDown(listbox, { key: "ArrowRight" });
      expect(getCssVar(firstCard, "--i")).toBe("1");

      // Additional presses should not change the value beyond the boundary.
      fireEvent.keyDown(listbox, { key: "ArrowRight" });
      expect(getCssVar(firstCard, "--i")).toBe("1");
    });

    it("ArrowLeft clamps at the minimum offset and stops changing", () => {
      render(<CardSpread items={cardItems(sixUniqueCards)} />);

      const listbox = screen.getByRole("listbox");
      const firstCard = getFirstOption();

      // One press reaches -maxOffset (-3 === -KEYBOARD_STEP for 6 cards).
      fireEvent.keyDown(listbox, { key: "ArrowLeft" });
      expect(getCssVar(firstCard, "--i")).toBe("-5");

      // Additional presses should not change the value beyond the boundary.
      fireEvent.keyDown(listbox, { key: "ArrowLeft" });
      expect(getCssVar(firstCard, "--i")).toBe("-5");
    });

    it("ArrowRight then ArrowLeft returns cards to their original positions", () => {
      render(<CardSpread items={cardItems(sixUniqueCards)} />);

      const listbox = screen.getByRole("listbox");
      const firstCard = getFirstOption();
      const initialValue = getCssVar(firstCard, "--i");

      fireEvent.keyDown(listbox, { key: "ArrowRight" });
      fireEvent.keyDown(listbox, { key: "ArrowLeft" });

      expect(getCssVar(firstCard, "--i")).toBe(initialValue);
    });

    it("when canMove=false, ArrowRight does not change card positions", () => {
      render(<CardSpread canMove={false} items={cardItems(sixUniqueCards)} />);

      const listbox = screen.getByRole("listbox");
      const firstCard = getFirstOption();
      const initialValue = getCssVar(firstCard, "--i");

      fireEvent.keyDown(listbox, { key: "ArrowRight" });

      expect(getCssVar(firstCard, "--i")).toBe(initialValue);
    });

    it("when canMove=false, ArrowLeft does not change card positions", () => {
      render(<CardSpread canMove={false} items={cardItems(sixUniqueCards)} />);

      const listbox = screen.getByRole("listbox");
      const firstCard = getFirstOption();
      const initialValue = getCssVar(firstCard, "--i");

      fireEvent.keyDown(listbox, { key: "ArrowLeft" });

      expect(getCssVar(firstCard, "--i")).toBe(initialValue);
    });

    it("unhandled keys such as Enter, Escape, and Tab do not change card positions", () => {
      render(<CardSpread items={cardItems(sixUniqueCards)} />);

      const listbox = screen.getByRole("listbox");
      const firstCard = getFirstOption();
      const initialValue = getCssVar(firstCard, "--i");

      fireEvent.keyDown(listbox, { key: "Enter" });
      fireEvent.keyDown(listbox, { key: "Escape" });
      fireEvent.keyDown(listbox, { key: "Tab" });

      expect(getCssVar(firstCard, "--i")).toBe(initialValue);
    });
  });

  describe("Edge cases", () => {
    it("renders empty card array without crashing", () => {
      render(<CardSpread items={cardItems([])} />);

      const listbox = screen.getByRole("listbox");
      expect(listbox).toBeInTheDocument();

      const options = screen.queryAllByRole("option");
      expect(options).toHaveLength(0);
    });

    it("renders empty number array without crashing", () => {
      render(<CardSpread items={numberItems([])} />);

      const listbox = screen.getByRole("listbox");
      expect(listbox).toBeInTheDocument();

      const options = screen.queryAllByRole("option");
      expect(options).toHaveLength(0);
    });

    it("renders single card", () => {
      const cards = [AceOfHearts];
      render(<CardSpread items={cardItems(cards)} />);

      expect(screen.getByLabelText("Ace of Hearts")).toBeInTheDocument();
      const options = screen.getAllByRole("option");
      expect(options).toHaveLength(1);
    });

    it("renders single number", () => {
      const numbers = [42];
      render(<CardSpread items={numberItems(numbers)} />);

      expect(screen.getByLabelText("Select position 42")).toBeInTheDocument();
      const options = screen.getAllByRole("option");
      expect(options).toHaveLength(1);
    });

    it("clicking a card without onItemClick is a no-op", () => {
      const cards = [AceOfHearts, TwoOfHearts];
      render(<CardSpread items={cardItems(cards)} />);

      const firstCard = screen.getByLabelText("Ace of Hearts");
      fireEvent.click(firstCard);

      expect(firstCard).toBeInTheDocument();
      expect(screen.getByLabelText("2 of Hearts")).toBeInTheDocument();
    });
  });
});
