import { Flex, Image } from "@mantine/core";
import type { KeyboardEvent } from "react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { SPREAD_CARD_HEIGHT, SPREAD_CARD_WIDTH } from "../../constants";
import type {
  CardSpreadCardsProps,
  CardSpreadProps,
} from "../../types/typeguards";
import { formatCardName } from "../../utils/card-formatting";
import { cssVarCounterStyle } from "../../utils/style";
import { NumberCard } from "../number-card";

const isCardsProps = (props: CardSpreadProps): props is CardSpreadCardsProps =>
  props.items.type === "cards";

const KEYBOARD_STEP = 3;

export const CardSpread = memo(function CardSpread(props: CardSpreadProps) {
  const {
    items,
    canMove = true,
    height = "100%",
    degree = 15,
    hasCursor = false,
  } = props;
  const [offset, setOffset] = useState(0);
  const touchLastPositionRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const movementAccumulatorRef = useRef(0);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      movementAccumulatorRef.current = 0;
    };
  }, []);

  const updateOffset = useCallback(
    (movementX: number) => {
      const maxOffset = items.data.length / 2;
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
    [items.data.length]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (canMove && e.buttons === 1) {
        movementAccumulatorRef.current += e.nativeEvent.movementX;
        if (rafRef.current === null) {
          rafRef.current = requestAnimationFrame(() => {
            const accumulated = movementAccumulatorRef.current;
            movementAccumulatorRef.current = 0;
            updateOffset(accumulated);
            rafRef.current = null;
          });
        }
      }
    },
    [canMove, updateOffset]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (canMove && e.touches.length === 1) {
        const touch = e.nativeEvent.touches[0];
        if (!touch) {
          return;
        }
        const movementX = touch.screenX - touchLastPositionRef.current;
        touchLastPositionRef.current = touch.screenX;
        movementAccumulatorRef.current += movementX;
        if (rafRef.current === null) {
          rafRef.current = requestAnimationFrame(() => {
            const accumulated = movementAccumulatorRef.current;
            movementAccumulatorRef.current = 0;
            updateOffset(accumulated);
            rafRef.current = null;
          });
        }
      }
    },
    [canMove, updateOffset]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (!canMove) {
        return;
      }

      const maxOffset = items.data.length / 2;
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
    [canMove, items.data.length]
  );

  const renderItems = () => {
    if (isCardsProps(props)) {
      return props.items.data.map((item, index) => (
        <button
          aria-label={formatCardName(item)}
          aria-selected={false}
          className="cardSpreadCard"
          key={`card_${item.suit}_${item.rank}`}
          onClick={() => props.onItemClick?.(item, index)}
          role="option"
          style={{
            cursor: hasCursor ? "pointer" : "default",
            ...cssVarCounterStyle(index, props.items.data.length / 2, offset),
          }}
          type="button"
        >
          <Image
            alt={formatCardName(item)}
            h={SPREAD_CARD_HEIGHT}
            src={item.image}
            w={SPREAD_CARD_WIDTH}
          />
        </button>
      ));
    }
    return props.items.data.map((item, index) => (
      <button
        aria-label={`Select position ${item}`}
        aria-selected={false}
        className="cardSpreadCard"
        key={`number_${item}`}
        onClick={() => props.onItemClick?.(item, index)}
        role="option"
        style={{
          cursor: hasCursor ? "pointer" : "default",
          ...cssVarCounterStyle(index, props.items.data.length / 2, offset),
        }}
        type="button"
      >
        <NumberCard number={item} />
      </button>
    ));
  };

  return (
    <Flex
      align="start"
      aria-label="Card spread - use arrow keys to navigate"
      className="cardSpreadContainer"
      justify="center"
      mih={height}
      onKeyDown={handleKeyDown}
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
      role="listbox"
      style={{ "--degree": `${degree}deg` }}
      tabIndex={canMove ? 0 : undefined}
    >
      {renderItems()}
    </Flex>
  );
});
