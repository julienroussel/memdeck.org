import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

const SELECT_POSITION_REGEX = /Select position/;

describe("CardSpread", () => {
  describe("Card items", () => {
    it("renders card items with correct aria-labels", () => {
      const cards = [AceOfHearts, TwoOfHearts, ThreeOfHearts];
      render(<CardSpread items={cardItems(cards)} />);

      expect(screen.getByLabelText("Ace of Hearts")).toBeInTheDocument();
      expect(screen.getByLabelText("Two of Hearts")).toBeInTheDocument();
      expect(screen.getByLabelText("Three of Hearts")).toBeInTheDocument();
    });

    it("renders card images as decorative (empty alt) so the button label is not duplicated", () => {
      const cards = [AceOfHearts, TwoOfHearts];
      render(<CardSpread items={cardItems(cards)} />);

      const image = screen.getByLabelText("Ace of Hearts").querySelector("img");
      expect(image).toHaveAttribute("alt", "");
    });

    it("clicking a card item calls onItemClick with correct card and index", () => {
      const cards = [AceOfHearts, TwoOfHearts, ThreeOfHearts];
      const handleClick = vi.fn();
      render(<CardSpread items={cardItems(cards)} onItemClick={handleClick} />);

      const secondCard = screen.getByLabelText("Two of Hearts");
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

      fireEvent.click(screen.getByLabelText("Three of Hearts"));
      expect(handleClick).toHaveBeenCalledWith(ThreeOfHearts, 2);

      expect(handleClick).toHaveBeenCalledTimes(2);
    });
  });

  describe("Number items", () => {
    it("renders number items with correct aria-labels", () => {
      const numbers = [1, 5, 10];
      render(<CardSpread items={numberItems(numbers)} onItemClick={vi.fn()} />);

      expect(screen.getByLabelText("Select position 1")).toBeInTheDocument();
      expect(screen.getByLabelText("Select position 5")).toBeInTheDocument();
      expect(screen.getByLabelText("Select position 10")).toBeInTheDocument();
    });

    it("names number items as distances, sign included, when numberLabel is distance", () => {
      render(
        <CardSpread
          items={numberItems([-3, 2])}
          numberLabel="distance"
          onItemClick={vi.fn()}
        />
      );

      expect(
        screen.getByRole("button", { name: "Select distance -3" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Select distance 2" })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: SELECT_POSITION_REGEX })
      ).not.toBeInTheDocument();
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
    it("renders a group container with an accessible label when movable", () => {
      const cards = [AceOfHearts, TwoOfHearts];
      render(<CardSpread items={cardItems(cards)} />);

      const group = screen.getByRole("group");
      expect(group).toBeInTheDocument();
      expect(group).toHaveAttribute("aria-label", "Card spread");
    });

    it("renders a group container with an accessible label when canMove is false", () => {
      const cards = [AceOfHearts, TwoOfHearts];
      render(<CardSpread canMove={false} items={cardItems(cards)} />);

      const group = screen.getByRole("group");
      expect(group).toHaveAttribute("aria-label", "Card spread");
    });

    it("when canMove=false, the container is not focusable", () => {
      const cards = [AceOfHearts, TwoOfHearts];
      render(<CardSpread canMove={false} items={cardItems(cards)} />);

      const group = screen.getByRole("group");
      expect(group).not.toHaveAttribute("tabIndex");
    });

    it("when canMove=true, the container is a group landmark but not focusable", () => {
      const cards = [AceOfHearts, TwoOfHearts];
      render(
        <CardSpread
          canMove={true}
          items={cardItems(cards)}
          onItemClick={vi.fn()}
        />
      );

      const group = screen.getByRole("group");
      expect(group).not.toHaveAttribute("tabIndex");
    });

    it("when canMove is not specified, the container is a group landmark but not focusable", () => {
      const cards = [AceOfHearts, TwoOfHearts];
      render(<CardSpread items={cardItems(cards)} onItemClick={vi.fn()} />);

      const group = screen.getByRole("group");
      expect(group).not.toHaveAttribute("tabIndex");
    });
  });

  describe("Keyboard navigation", () => {
    // The component tracks an `offset` value that shifts all cards visually.
    // The offset is applied as a `--offset` CSS custom property on the
    // CONTAINER (so each drag/keyboard step re-renders one node instead of
    // all 52 buttons), while each card keeps a static `--i` computed as:
    //   index + 1 - (items.length / 2)
    // styles.css combines them: calc((var(--i) + var(--offset)) * ...).
    // ArrowRight increases offset by KEYBOARD_STEP (3), ArrowLeft decreases it.
    // maxOffset = items.length / 2. Using 6 cards: maxOffset = 3, KEYBOARD_STEP = 3.
    // Initial --offset = 0; card[0] --i = 0 + 1 - 3 = -2 and never changes.

    const sixUniqueCards = [
      AceOfHearts,
      TwoOfHearts,
      ThreeOfHearts,
      FourOfHearts,
      FiveOfHearts,
      SixOfHearts,
    ];

    const getFirstButton = () => {
      const buttons = screen.getAllByRole("button");
      const [first] = buttons;
      if (!first) {
        throw new Error("Expected at least one button element");
      }
      return first;
    };

    const getCssVar = (el: HTMLElement, name: string) =>
      el.style.getPropertyValue(name);

    it("ArrowRight increases the container offset, leaving per-card --i static", () => {
      render(
        <CardSpread items={cardItems(sixUniqueCards)} onItemClick={vi.fn()} />
      );

      const group = screen.getByRole("group");
      const firstCard = getFirstButton();

      expect(getCssVar(group, "--offset")).toBe("0");
      expect(getCssVar(firstCard, "--i")).toBe("-2");

      fireEvent.keyDown(group, { key: "ArrowRight" });

      expect(getCssVar(group, "--offset")).toBe("3");
      expect(getCssVar(firstCard, "--i")).toBe("-2");
    });

    it("ArrowLeft decreases the container offset, leaving per-card --i static", () => {
      render(
        <CardSpread items={cardItems(sixUniqueCards)} onItemClick={vi.fn()} />
      );

      const group = screen.getByRole("group");
      const firstCard = getFirstButton();

      expect(getCssVar(group, "--offset")).toBe("0");
      expect(getCssVar(firstCard, "--i")).toBe("-2");

      fireEvent.keyDown(group, { key: "ArrowLeft" });

      expect(getCssVar(group, "--offset")).toBe("-3");
      expect(getCssVar(firstCard, "--i")).toBe("-2");
    });

    it("ArrowRight clamps at the maximum offset and stops changing", () => {
      render(<CardSpread items={cardItems(sixUniqueCards)} />);

      const group = screen.getByRole("group");

      // One press reaches maxOffset (3 === KEYBOARD_STEP for 6 cards).
      fireEvent.keyDown(group, { key: "ArrowRight" });
      expect(getCssVar(group, "--offset")).toBe("3");

      // Additional presses should not change the value beyond the boundary.
      fireEvent.keyDown(group, { key: "ArrowRight" });
      expect(getCssVar(group, "--offset")).toBe("3");
    });

    it("ArrowLeft clamps at the minimum offset and stops changing", () => {
      render(<CardSpread items={cardItems(sixUniqueCards)} />);

      const group = screen.getByRole("group");

      // One press reaches -maxOffset (-3 === -KEYBOARD_STEP for 6 cards).
      fireEvent.keyDown(group, { key: "ArrowLeft" });
      expect(getCssVar(group, "--offset")).toBe("-3");

      // Additional presses should not change the value beyond the boundary.
      fireEvent.keyDown(group, { key: "ArrowLeft" });
      expect(getCssVar(group, "--offset")).toBe("-3");
    });

    it("ArrowRight then ArrowLeft returns cards to their original positions", () => {
      render(<CardSpread items={cardItems(sixUniqueCards)} />);

      const group = screen.getByRole("group");
      const initialValue = getCssVar(group, "--offset");

      fireEvent.keyDown(group, { key: "ArrowRight" });
      fireEvent.keyDown(group, { key: "ArrowLeft" });

      expect(getCssVar(group, "--offset")).toBe(initialValue);
    });

    it("when canMove=false, ArrowRight does not change card positions", () => {
      render(<CardSpread canMove={false} items={cardItems(sixUniqueCards)} />);

      const group = screen.getByRole("group");
      const initialValue = getCssVar(group, "--offset");

      fireEvent.keyDown(group, { key: "ArrowRight" });

      expect(getCssVar(group, "--offset")).toBe(initialValue);
    });

    it("when canMove=false, ArrowLeft does not change card positions", () => {
      render(<CardSpread canMove={false} items={cardItems(sixUniqueCards)} />);

      const group = screen.getByRole("group");
      const initialValue = getCssVar(group, "--offset");

      fireEvent.keyDown(group, { key: "ArrowLeft" });

      expect(getCssVar(group, "--offset")).toBe(initialValue);
    });

    it("unhandled keys such as Enter, Escape, and Tab do not change card positions", () => {
      render(<CardSpread items={cardItems(sixUniqueCards)} />);

      const group = screen.getByRole("group");
      const initialValue = getCssVar(group, "--offset");

      fireEvent.keyDown(group, { key: "Enter" });
      fireEvent.keyDown(group, { key: "Escape" });
      fireEvent.keyDown(group, { key: "Tab" });

      expect(getCssVar(group, "--offset")).toBe(initialValue);
    });
  });

  describe("Edge cases", () => {
    it("renders empty card array without crashing", () => {
      render(<CardSpread items={cardItems([])} />);

      const group = screen.getByRole("group");
      expect(group).toBeInTheDocument();

      const buttons = screen.queryAllByRole("button");
      expect(buttons).toHaveLength(0);
    });

    it("renders empty number array without crashing", () => {
      render(<CardSpread items={numberItems([])} />);

      const group = screen.getByRole("group");
      expect(group).toBeInTheDocument();

      const buttons = screen.queryAllByRole("button");
      expect(buttons).toHaveLength(0);
    });

    it("renders single card", () => {
      const cards = [AceOfHearts];
      render(<CardSpread items={cardItems(cards)} onItemClick={vi.fn()} />);

      expect(screen.getByLabelText("Ace of Hearts")).toBeInTheDocument();
      const buttons = screen.getAllByRole("button");
      expect(buttons).toHaveLength(1);
    });

    it("renders single number", () => {
      const numbers = [42];
      render(<CardSpread items={numberItems(numbers)} onItemClick={vi.fn()} />);

      expect(screen.getByLabelText("Select position 42")).toBeInTheDocument();
      const buttons = screen.getAllByRole("button");
      expect(buttons).toHaveLength(1);
    });

    it("clicking a card without onItemClick is a no-op", () => {
      const cards = [AceOfHearts, TwoOfHearts];
      render(<CardSpread items={cardItems(cards)} />);

      const firstCard = screen.getByLabelText("Ace of Hearts");
      fireEvent.click(firstCard);

      expect(firstCard).toBeInTheDocument();
      expect(screen.getByLabelText("Two of Hearts")).toBeInTheDocument();
    });
  });

  describe("Display-only spread (no onItemClick)", () => {
    it("exposes cards as named images, not buttons", () => {
      const cards = [AceOfHearts, TwoOfHearts];
      render(<CardSpread items={cardItems(cards)} />);

      expect(screen.queryAllByRole("button")).toHaveLength(0);
      expect(
        screen.getByRole("img", { name: "Ace of Hearts" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("img", { name: "Two of Hearts" })
      ).toBeInTheDocument();
    });

    it("exposes numbers through the number card image, not buttons", () => {
      render(<CardSpread items={numberItems([1, 5])} />);

      expect(screen.queryAllByRole("button")).toHaveLength(0);
      expect(screen.getAllByTestId("number-card")).toHaveLength(2);
    });

    it("gives display-only cards and numbers a static --i of index + 1 - items/2", () => {
      const { unmount } = render(
        <CardSpread items={cardItems([AceOfHearts, TwoOfHearts])} />
      );
      const cardValues = screen
        .getAllByRole("img")
        .map((el) => el.style.getPropertyValue("--i"));
      expect(cardValues).toEqual(["0", "1"]);
      unmount();

      render(<CardSpread items={numberItems([1, 5])} />);
      const numberValues = screen
        .getAllByTestId("number-card")
        .map((el) => el.parentElement?.style.getPropertyValue("--i"));
      expect(numberValues).toEqual(["0", "1"]);
    });

    it("makes the movable container the single tab stop for arrow-key panning", () => {
      render(<CardSpread items={cardItems([AceOfHearts, TwoOfHearts])} />);

      const group = screen.getByRole("group");
      expect(group).toHaveAttribute("tabIndex", "0");

      fireEvent.keyDown(group, { key: "ArrowRight" });
      expect(group.style.getPropertyValue("--offset")).toBe("1");
    });

    it("leaves the container unfocusable when canMove=false", () => {
      render(
        <CardSpread
          canMove={false}
          items={cardItems([AceOfHearts, TwoOfHearts])}
        />
      );

      expect(screen.getByRole("group")).not.toHaveAttribute("tabIndex");
    });
  });

  describe("Drag panning", () => {
    // 6 cards: maxOffset = 3. Movement is batched per animation frame, so the
    // rAF stub queues callbacks and flushFrames() runs them like a real frame.
    const sixUniqueCards = [
      AceOfHearts,
      TwoOfHearts,
      ThreeOfHearts,
      FourOfHearts,
      FiveOfHearts,
      SixOfHearts,
    ];
    const frames: FrameRequestCallback[] = [];

    beforeEach(() => {
      vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
        frames.push(cb);
        return frames.length;
      });
      vi.stubGlobal("cancelAnimationFrame", vi.fn());
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      frames.length = 0;
    });

    const flushFrames = () => {
      act(() => {
        for (const cb of frames.splice(0)) {
          cb(0);
        }
      });
    };

    const offsetOf = (el: HTMLElement) => el.style.getPropertyValue("--offset");

    const touch = (el: HTMLElement, type: "start" | "move", x: number) => {
      const init = { touches: [{ screenX: x }] };
      if (type === "start") {
        fireEvent.touchStart(el, init);
      } else {
        fireEvent.touchMove(el, init);
      }
    };

    it("pans with the finger on the first move of each gesture, wherever it starts", () => {
      render(<CardSpread items={cardItems(sixUniqueCards)} />);
      const group = screen.getByRole("group");

      touch(group, "start", 300);
      touch(group, "move", 290);
      flushFrames();
      expect(offsetOf(group)).toBe("-1");

      fireEvent.touchEnd(group);
      touch(group, "start", 50);
      touch(group, "move", 60);
      flushFrames();
      expect(offsetOf(group)).toBe("0");
    });

    it("clamps touch panning at ±items/2", () => {
      render(<CardSpread items={cardItems(sixUniqueCards)} />);
      const group = screen.getByRole("group");

      touch(group, "start", 100);
      for (const x of [110, 120, 130, 140, 150]) {
        touch(group, "move", x);
        flushFrames();
      }
      expect(offsetOf(group)).toBe("3");

      touch(group, "start", 100);
      for (const x of [90, 80, 70, 60, 50, 40, 30, 20]) {
        touch(group, "move", x);
        flushFrames();
      }
      expect(offsetOf(group)).toBe("-3");
    });

    it("pans with a primary-button mouse drag and clamps at ±items/2", () => {
      render(<CardSpread items={cardItems(sixUniqueCards)} />);
      const group = screen.getByRole("group");

      fireEvent.mouseMove(group, { buttons: 1, movementX: -4 });
      flushFrames();
      expect(offsetOf(group)).toBe("-1");

      for (const movementX of [4, 4, 4, 4, 4, 4]) {
        fireEvent.mouseMove(group, { buttons: 1, movementX });
        flushFrames();
      }
      expect(offsetOf(group)).toBe("3");
    });

    it("ignores mouse moves without the primary button held", () => {
      render(<CardSpread items={cardItems(sixUniqueCards)} />);
      const group = screen.getByRole("group");

      fireEvent.mouseMove(group, { buttons: 0, movementX: -4 });
      flushFrames();
      expect(offsetOf(group)).toBe("0");
    });

    it("ignores mouse and touch drags when canMove=false", () => {
      render(<CardSpread canMove={false} items={cardItems(sixUniqueCards)} />);
      const group = screen.getByRole("group");

      fireEvent.mouseMove(group, { buttons: 1, movementX: -4 });
      touch(group, "start", 300);
      touch(group, "move", 290);
      flushFrames();
      expect(offsetOf(group)).toBe("0");
    });
  });

  describe("Pan on keyboard focus", () => {
    // 52 items so cards far from the centre would be clipped by the container.
    const fiftyTwo = Array.from({ length: 52 }, (_, i) => i + 1);

    const getNumberButton = (position: number) =>
      screen.getByRole("button", { name: `Select position ${position}` });

    it("centres a keyboard-focused item by setting --offset to minus its --i", () => {
      render(
        <CardSpread items={numberItems(fiftyTwo)} onItemClick={vi.fn()} />
      );
      const group = screen.getByRole("group");

      const first = getNumberButton(1);
      vi.spyOn(first, "matches").mockReturnValue(true);
      act(() => first.focus());
      // index 0 of 52: --i = 0 + 1 - 26 = -25.
      expect(first.style.getPropertyValue("--i")).toBe("-25");
      expect(group.style.getPropertyValue("--offset")).toBe("25");

      const last = getNumberButton(52);
      vi.spyOn(last, "matches").mockReturnValue(true);
      act(() => last.focus());
      expect(group.style.getPropertyValue("--offset")).toBe("-26");
    });

    it("does not pan when focus is not keyboard-visible (mouse click)", () => {
      render(
        <CardSpread items={numberItems(fiftyTwo)} onItemClick={vi.fn()} />
      );
      const group = screen.getByRole("group");

      const first = getNumberButton(1);
      vi.spyOn(first, "matches").mockReturnValue(false);
      act(() => first.focus());
      expect(group.style.getPropertyValue("--offset")).toBe("0");
    });

    it("does not pan when canMove=false", () => {
      render(
        <CardSpread
          canMove={false}
          items={numberItems(fiftyTwo)}
          onItemClick={vi.fn()}
        />
      );
      const group = screen.getByRole("group");

      const first = getNumberButton(1);
      vi.spyOn(first, "matches").mockReturnValue(true);
      act(() => first.focus());
      expect(group.style.getPropertyValue("--offset")).toBe("0");
    });
  });
});
