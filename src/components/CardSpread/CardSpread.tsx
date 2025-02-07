import { Flex, Image } from '@mantine/core';
import { CSSProperties, useState } from 'react';
import { cssVarCounterStyle } from '../../utils/style';
import {
  CardSpreadProps,
  isNumberArray,
  isPlayingCardArray,
} from '../../types/typeguards';
import { NumberCard } from '../NumberCard';

const cardSpreadStyle: CSSProperties = {
  overflow: 'hidden',
  position: 'relative',
  width: '100%',
};

const cardStyle = (degree: number): CSSProperties => ({
  position: 'absolute',
  transformOrigin: '50% 100%',
  transform: `rotate(calc(var(--i) * ${degree}deg)) translate(calc(var(--i) * 15px), 10px)`,
  boxShadow: '0 2px 5px rgba(0, 0, 0, 0.25)',
  borderRadius: '3%',
});

export const CardSpread = ({
  items,
  canMove = true,
  height = '40svh',
  degree = 15,
  onItemClick = () => {},
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
      style={cardSpreadStyle}
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
            style={{
              ...cardStyle(degree),
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
            style={{
              ...cardStyle(degree),
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
