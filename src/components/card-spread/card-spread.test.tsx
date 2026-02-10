import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { render } from "../../test-utils";
import {
  AceOfHearts,
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
    it("ArrowLeft key event does not crash", () => {
      const cards = [AceOfHearts, TwoOfHearts, ThreeOfHearts];
      render(<CardSpread items={cardItems(cards)} />);

      const listbox = screen.getByRole("listbox");
      expect(() => {
        fireEvent.keyDown(listbox, { key: "ArrowLeft" });
      }).not.toThrow();
    });

    it("ArrowRight key event does not crash", () => {
      const cards = [AceOfHearts, TwoOfHearts, ThreeOfHearts];
      render(<CardSpread items={cardItems(cards)} />);

      const listbox = screen.getByRole("listbox");
      expect(() => {
        fireEvent.keyDown(listbox, { key: "ArrowRight" });
      }).not.toThrow();
    });

    it("multiple keyboard events do not crash", () => {
      const cards = [AceOfHearts, TwoOfHearts, ThreeOfHearts];
      render(<CardSpread items={cardItems(cards)} />);

      const listbox = screen.getByRole("listbox");
      expect(() => {
        fireEvent.keyDown(listbox, { key: "ArrowLeft" });
        fireEvent.keyDown(listbox, { key: "ArrowRight" });
        fireEvent.keyDown(listbox, { key: "ArrowLeft" });
        fireEvent.keyDown(listbox, { key: "ArrowRight" });
      }).not.toThrow();
    });

    it("keyboard events do not crash when canMove is false", () => {
      const cards = [AceOfHearts, TwoOfHearts, ThreeOfHearts];
      render(<CardSpread canMove={false} items={cardItems(cards)} />);

      const listbox = screen.getByRole("listbox");
      expect(() => {
        fireEvent.keyDown(listbox, { key: "ArrowLeft" });
        fireEvent.keyDown(listbox, { key: "ArrowRight" });
      }).not.toThrow();
    });

    it("other keyboard events do not crash", () => {
      const cards = [AceOfHearts, TwoOfHearts, ThreeOfHearts];
      render(<CardSpread items={cardItems(cards)} />);

      const listbox = screen.getByRole("listbox");
      expect(() => {
        fireEvent.keyDown(listbox, { key: "Enter" });
        fireEvent.keyDown(listbox, { key: "Escape" });
        fireEvent.keyDown(listbox, { key: "Tab" });
      }).not.toThrow();
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

    it("onItemClick is optional and component works without it", () => {
      const cards = [AceOfHearts, TwoOfHearts];
      render(<CardSpread items={cardItems(cards)} />);

      const firstCard = screen.getByLabelText("Ace of Hearts");
      expect(() => {
        fireEvent.click(firstCard);
      }).not.toThrow();
    });
  });
});
