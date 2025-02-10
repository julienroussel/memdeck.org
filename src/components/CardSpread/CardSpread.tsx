import { Flex, Image } from '@mantine/core';
import { useState } from 'react';
import { cssVarCounterStyle } from '../../utils/style';
import {
  CardSpreadProps,
  isNumberArray,
  isPlayingCardArray,
} from '../../types/typeguards';
import { NumberCard } from '../NumberCard';

export const CardSpread = ({
  items,
  canMove = true,
  height = '40svh',
  degree = 15,
  onItemClick = () => {},
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

  return (
    <Flex
      mih={height}
      justify="center"
      align="start"
      className="cardSpreadContainer"
      style={{ '--degree': `${degree}deg` }}
      onMouseMove={(e) => {
        if (canMove && e.buttons === 1) {
          updateOffset(e.nativeEvent.movementX);
        }
      }}
      onTouchMove={(e) => {
        if (canMove && e.touches.length === 1) {
          const touchPosition = e.nativeEvent.touches[0].screenX;
          updateOffset(touchPosition - touchLastPosition);
          setTouchLastPosition(touchPosition);
        }
      }}
    >
      {isPlayingCardArray(items) ? (
        items.map((item, index) => (
          <Image
            w={80}
            key={`${item.suit}_${item.rank}`}
            className="cardSpreadCard"
            style={{
              ...{ cursor: hasCursor ? 'pointer' : 'default' },
              ...cssVarCounterStyle(index, items.length / 2, offset),
            }}
            src={item.image}
            onClick={() => onItemClick(item, index)}
          />
        ))
      ) : isNumberArray(items) ? (
        items.map((item, index) => (
          <div
            key={`number_${item}`}
            className="cardSpreadCard"
            style={{
              ...{ cursor: hasCursor ? 'pointer' : 'default' },
              ...cssVarCounterStyle(index, items.length / 2, offset),
            }}
            onClick={() => onItemClick(item, index)}
          >
            <NumberCard number={item} />
          </div>
        ))
      ) : (
        <p>Error: invalid parameters</p>
      )}
    </Flex>
  );
};
