import { Flex, Image } from "@mantine/core";
import type { KeyboardEvent } from "react";
import { memo, useCallback, useState } from "react";
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
  const [touchLastPosition, setTouchLastPosition] = useState(0);

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

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (canMove && e.buttons === 1) {
      updateOffset(e.nativeEvent.movementX);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (canMove && e.touches.length === 1) {
      const touch = e.nativeEvent.touches[0];
      if (!touch) {
        return;
      }
      updateOffset(touch.screenX - touchLastPosition);
      setTouchLastPosition(touch.screenX);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
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
  };

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
          <Image alt={formatCardName(item)} src={item.image} w={80} />
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
