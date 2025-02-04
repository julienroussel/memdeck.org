import { Center, Space, Title } from '@mantine/core';
import { VarCSSProperty } from '../utils/style';
import { useState } from 'react';

const shuffle = (array: string[]) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const CARDS = shuffle([
  'cards/spades_ace.svg',
  'cards/spades_2.svg',
  'cards/spades_3.svg',
  'cards/spades_4.svg',
  'cards/spades_5.svg',
  'cards/spades_6.svg',
  'cards/spades_7.svg',
  'cards/spades_8.svg',
  'cards/spades_9.svg',
  'cards/spades_10.svg',
  'cards/spades_jack.svg',
  'cards/spades_queen.svg',
  'cards/spades_king.svg',
  'cards/hearts_ace.svg',
  'cards/hearts_2.svg',
  'cards/hearts_3.svg',
  'cards/hearts_4.svg',
  'cards/hearts_5.svg',
  'cards/hearts_6.svg',
  'cards/hearts_7.svg',
  'cards/hearts_8.svg',
  'cards/hearts_9.svg',
  'cards/hearts_10.svg',
  'cards/hearts_jack.svg',
  'cards/hearts_queen.svg',
  'cards/hearts_king.svg',
  'cards/clubs_ace.svg',
  'cards/clubs_2.svg',
  'cards/clubs_3.svg',
  'cards/clubs_4.svg',
  'cards/clubs_5.svg',
  'cards/clubs_6.svg',
  'cards/clubs_7.svg',
  'cards/clubs_8.svg',
  'cards/clubs_9.svg',
  'cards/clubs_10.svg',
  'cards/clubs_jack.svg',
  'cards/clubs_queen.svg',
  'cards/clubs_king.svg',
  'cards/diamonds_ace.svg',
  'cards/diamonds_2.svg',
  'cards/diamonds_3.svg',
  'cards/diamonds_4.svg',
  'cards/diamonds_5.svg',
  'cards/diamonds_6.svg',
  'cards/diamonds_7.svg',
  'cards/diamonds_8.svg',
  'cards/diamonds_9.svg',
  'cards/diamonds_10.svg',
  'cards/diamonds_jack.svg',
  'cards/diamonds_queen.svg',
  'cards/diamonds_king.svg',
]);

export const Test = () => {
  const clickOnCard = (card: string, index: number) => {
    setSelected(card);
    CARDS.splice(index, 1);
  };
  const [selected, setSelected] = useState('');

  return (
    <>
      <Title order={1}>TEST</Title>
      <Space h="lg" />
      <Center>
        {' '}
        <img
          className="singleCard"
          src={selected === '' ? 'cards/blank_card.svg' : selected}
        />
      </Center>
      <div className="cardContainer">
        {CARDS.map((card, index) => (
          <img
            key={card}
            className="ribbonCard singleCard"
            style={{ '--i': index + 1 - CARDS.length / 2 } as VarCSSProperty}
            src={card}
            onClick={() => clickOnCard(card, index)}
          />
        ))}
      </div>
    </>
  );
};
