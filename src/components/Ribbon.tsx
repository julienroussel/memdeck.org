import { Flex, Image } from '@mantine/core';
import { VarCSSProperty } from '../utils/style';
import { PlayingCard } from '../types/playingcard';
import { useState } from 'react';

export const Ribbon = ({ cards }: { cards: PlayingCard[] }) => {
  const [offset, setOffset] = useState(0);
  const [touchLastPosition, setTouchLastPosition] = useState(0);

  const updateOffset = (movementX: number) => {
    if (movementX < 0 && offset > -cards.length / 2) {
      setOffset(offset - 1);
    }
    if (movementX > 0 && offset < cards.length / 2) {
      setOffset(offset + 1);
    }
  };

  return (
    <Flex
      mih="50svh"
      justify="center"
      align="start"
      className="ribbonContainer"
      onMouseMove={(e) => {
        if (e.buttons === 1) {
          updateOffset(e.nativeEvent.movementX);
        }
      }}
      onTouchMove={(e) => {
        if (e.touches.length === 1) {
          const touchPosition = e.nativeEvent.touches[0].screenX;
          updateOffset(touchPosition - touchLastPosition);
          setTouchLastPosition(touchPosition);
        }
      }}
    >
      {cards.map((card, index) => (
        <Image
          w={80}
          key={`${card.suit}_${card.rank}`}
          className="ribbonCard cardShadow"
          style={
            { '--i': index + 2 - cards.length / 2 + offset } as VarCSSProperty
          }
          src={card.image}
        />
      ))}
    </Flex>
  );
};
