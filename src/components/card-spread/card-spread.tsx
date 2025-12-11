import { Flex, Image } from "@mantine/core";
import { useState } from "react";
import {
  type CardSpreadProps,
  isNumberArray,
  isPlayingCardArray,
} from "../../types/typeguards";
import { cssVarCounterStyle } from "../../utils/style";
import { NumberCard } from "../number-card";

export const CardSpread = ({
  items,
  canMove = true,
  height = "100%",
  degree = 15,
  onItemClick,
  hasCursor = false,
}: CardSpreadProps) => {
  const [offset, setOffset] = useState(0);
  const [touchLastPosition, setTouchLastPosition] = useState(0);

  const updateOffset = (movementX: number) => {
    if (movementX < 0 && offset > -items.length / 2) {
      setOffset(offset - 1);
    }
    if (movementX > 0 && offset < items.length / 2) {
      setOffset(offset + 1);
    }
  };

  const renderItems = () => {
    if (isPlayingCardArray(items)) {
      return items.map((item, index) => (
        <Image
          className="cardSpreadCard"
          key={`${item.suit}_${item.rank}`}
          onClick={() => onItemClick?.(item, index)}
          src={item.image}
          style={{
            ...{ cursor: hasCursor ? "pointer" : "default" },
            ...cssVarCounterStyle(index, items.length / 2, offset),
          }}
          w={80}
        />
      ));
    }
    if (isNumberArray(items)) {
      return items.map((item, index) => (
        // biome-ignore lint/a11y/useKeyWithClickEvents: we don't need a key with click events here
        // biome-ignore lint/a11y/noNoninteractiveElementInteractions: we don't need a non-interactive element here
        // biome-ignore lint/a11y/noStaticElementInteractions: we don't need a static element here
        <div
          className="cardSpreadCard"
          key={`number_${item}`}
          onClick={() => onItemClick?.(item, index)}
          style={{
            ...{ cursor: hasCursor ? "pointer" : "default" },
            ...cssVarCounterStyle(index, items.length / 2, offset),
          }}
        >
          <NumberCard number={item} />
        </div>
      ));
    }
    return <p>Error: invalid parameters</p>;
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
