import type { KeyboardEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

const KEYBOARD_STEP = 3;

type MouseDrag = { buttons: number; nativeEvent: { movementX: number } };

type TouchGesture = {
  touches: Pick<TouchList, "length">;
  nativeEvent: { touches: Iterable<Pick<Touch, "screenX">> };
};

type SpreadOffsetOptions = { canMove: boolean; itemCount: number };

type SpreadOffset = {
  offset: number;
  handleFocus: (event: { target: EventTarget }) => void;
  handleKeyDown: (event: Pick<KeyboardEvent, "key" | "preventDefault">) => void;
  handleMouseMove: (e: MouseDrag) => void;
  handleTouchMove: (e: TouchGesture) => void;
  handleTouchStart: (e: TouchGesture) => void;
};

export const useSpreadOffset = ({
  canMove,
  itemCount,
}: SpreadOffsetOptions): SpreadOffset => {
  const [offset, setOffset] = useState(0);
  const touchLastPositionRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const movementAccumulatorRef = useRef(0);

  useEffect(
    () => () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      movementAccumulatorRef.current = 0;
    },
    []
  );

  const updateOffset = useCallback(
    (movementX: number) => {
      const maxOffset = itemCount / 2;
      setOffset((prev) => {
        if (movementX < 0 && prev > -maxOffset) {
          return prev - 1;
        }
        if (movementX > 0 && prev < maxOffset) {
          return prev + 1;
        }
        return prev;
      });
    },
    [itemCount]
  );

  const queueMovement = useCallback(
    (movementX: number) => {
      movementAccumulatorRef.current += movementX;
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => {
          const accumulated = movementAccumulatorRef.current;
          movementAccumulatorRef.current = 0;
          updateOffset(accumulated);
          rafRef.current = null;
        });
      }
    },
    [updateOffset]
  );

  const handleMouseMove = useCallback(
    (e: MouseDrag) => {
      if (canMove && e.buttons === 1) {
        queueMovement(e.nativeEvent.movementX);
      }
    },
    [canMove, queueMovement]
  );

  const handleTouchStart = useCallback((e: TouchGesture) => {
    const [touch] = e.nativeEvent.touches;
    if (touch) {
      touchLastPositionRef.current = touch.screenX;
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchGesture) => {
      if (canMove && e.touches.length === 1) {
        const [touch] = e.nativeEvent.touches;
        if (!touch) {
          return;
        }
        const movementX = touch.screenX - touchLastPositionRef.current;
        touchLastPositionRef.current = touch.screenX;
        queueMovement(movementX);
      }
    },
    [canMove, queueMovement]
  );

  const handleKeyDown = useCallback(
    (event: Pick<KeyboardEvent, "key" | "preventDefault">) => {
      if (!canMove) {
        return;
      }

      const maxOffset = itemCount / 2;
      switch (event.key) {
        case "ArrowLeft":
          event.preventDefault();
          setOffset((prev) => Math.max(prev - KEYBOARD_STEP, -maxOffset));
          break;
        case "ArrowRight":
          event.preventDefault();
          setOffset((prev) => Math.min(prev + KEYBOARD_STEP, maxOffset));
          break;
        default:
          break;
      }
    },
    [canMove, itemCount]
  );

  // Pan so a keyboard-focused item sits at the centre: overflow clips cards
  // far from the middle, so Tab would otherwise land on invisible items.
  // Mouse-originated focus is skipped so a click never shifts the spread.
  const handleFocus = useCallback(
    (event: { target: EventTarget }) => {
      const { target } = event;
      if (
        !(
          canMove &&
          target instanceof HTMLElement &&
          target.matches(":focus-visible")
        )
      ) {
        return;
      }
      const index = Number(
        target.dataset.cardIndex ?? target.dataset.numberIndex
      );
      if (Number.isNaN(index)) {
        return;
      }
      setOffset(-(index + 1 - itemCount / 2));
    },
    [canMove, itemCount]
  );

  return {
    handleFocus,
    handleKeyDown,
    handleMouseMove,
    handleTouchMove,
    handleTouchStart,
    offset,
  };
};
