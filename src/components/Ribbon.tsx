import { Flex, Image } from '@mantine/core';
import { MemDeck } from '../types/stacks';
import { VarCSSProperty } from '../utils/style';

export const Ribbon = ({ stack }: { stack: MemDeck }) => {
  return (
    <Flex mih="40vh" justify="center" align="center">
      {stack.order.map((card, index) => (
        <Image
          w={80}
          key={`${card.suit}_${card.rank}`}
          className="ribbonCard cardShadow"
          style={{ '--i': index + 1 - 52 / 2 } as VarCSSProperty}
          src={card.image}
        />
      ))}
    </Flex>
  );
};
