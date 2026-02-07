import { Flex, Image } from "@mantine/core";
import type { KeyboardEvent } from "react";
import { memo, useState } from "react";
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

  const updateOffset = (movementX: number) => {
    if (movementX < 0 && offset > -items.data.length / 2) {
      setOffset(offset - 1);
    }
    if (movementX > 0 && offset < items.data.length / 2) {
      setOffset(offset + 1);
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
        <Image
          alt={formatCardName(item)}
          className="cardSpreadCard"
          key={`${item.suit}_${item.rank}`}
          onClick={() => props.onItemClick?.(item, index)}
          src={item.image}
          style={{
            cursor: hasCursor ? "pointer" : "default",
            ...cssVarCounterStyle(index, props.items.data.length / 2, offset),
          }}
          w={80}
        />
      ));
    }
    return props.items.data.map((item, index) => (
      <button
        aria-label={`Select position ${item}`}
        className="cardSpreadCard"
        key={`number_${item}`}
        onClick={() => props.onItemClick?.(item, index)}
        style={{
          cursor: hasCursor ? "pointer" : "default",
          background: "none",
          border: "none",
          padding: 0,
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
      onMouseMove={(e) => {
        if (canMove === true && e.buttons === 1) {
          updateOffset(e.nativeEvent.movementX);
        }
      }}
      onTouchMove={(e) => {
        if (canMove === true && e.touches.length === 1) {
          const touch = e.nativeEvent.touches[0];
          if (!touch) {
            return;
          }
          updateOffset(touch.screenX - touchLastPosition);
          setTouchLastPosition(touch.screenX);
        }
      }}
      role="listbox"
      style={{ "--degree": `${degree}deg` }}
      tabIndex={canMove ? 0 : undefined}
    >
      {renderItems()}
    </Flex>
  );
});
