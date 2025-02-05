import { Flex, Image } from '@mantine/core';
import { VarCSSProperty } from '../utils/style';
import { PlayingCard } from '../types/playingcard';
import { useState } from 'react';

export const Ribbon = ({ cards }: { cards: PlayingCard[] }) => {
  const [offset, setOffset] = useState(0);

  return (
    <Flex
      mih="40vh"
      justify="center"
      align="center"
      className="ribbonContainer"
      onMouseMove={(e) => {
        if (e.buttons === 1) {
          setOffset((e.clientX - window.innerWidth / 2) / 100);
        }
      }}
    >
      {cards.map((card, index) => (
        <Image
          w={80}
          key={`${card.suit}_${card.rank}`}
          className="ribbonCard cardShadow"
          style={
            { '--i': index + 1 - cards.length / 2 + offset } as VarCSSProperty
          }
          src={card.image}
        />
      ))}
    </Flex>
  );
};
