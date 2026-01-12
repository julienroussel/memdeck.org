import { Flex, Image } from "@mantine/core";
import { useState } from "react";
import type {
  CardSpreadCardsProps,
  CardSpreadProps,
} from "../../types/typeguards";
import { cssVarCounterStyle } from "../../utils/style";
import { NumberCard } from "../number-card";

const isCardsProps = (props: CardSpreadProps): props is CardSpreadCardsProps =>
  props.items.type === "cards";

export const CardSpread = (props: CardSpreadProps) => {
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

  const renderItems = () => {
    if (isCardsProps(props)) {
      return props.items.data.map((item, index) => (
        <Image
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
      className="cardSpreadContainer"
      justify="center"
      mih={height}
      onMouseMove={(e) => {
        if (canMove === true && e.buttons === 1) {
          updateOffset(e.nativeEvent.movementX);
        }
      }}
      onTouchMove={(e) => {
        if (canMove === true && e.touches.length === 1) {
          const touchPosition = e.nativeEvent.touches[0].screenX;
          updateOffset(touchPosition - touchLastPosition);
          setTouchLastPosition(touchPosition);
        }
      }}
      style={{ "--degree": `${degree}deg` }}
    >
      {renderItems()}
    </Flex>
  );
};
