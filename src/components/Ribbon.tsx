import { Flex, Image } from '@mantine/core';
import { VarCSSProperty } from '../utils/style';
import { PlayingCard } from '../types/playingcard';

export const Ribbon = ({ cards }: { cards: PlayingCard[] }) => {
  return (
    <Flex mih="40vh" justify="center" align="center">
      {cards.map((card, index) => (
        <Image
          w={80}
          key={`${card.suit}_${card.rank}`}
          className="ribbonCard cardShadow"
          style={{ '--i': index + 1 - cards.length / 2 } as VarCSSProperty}
          src={card.image}
        />
      ))}
    </Flex>
  );
};
