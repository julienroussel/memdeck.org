import { ActionIcon, Center, Group, Image, Space, Title } from '@mantine/core';
import { useState } from 'react';
import {
  getRandomPlayingCard,
  PlayingCardPosition,
  stacks,
} from '../../types/stacks';
import { usePageTracking } from '../../hooks/usePageTracking';
import { useDisclosure } from '@mantine/hooks';
import {
  FLASHCARD_NEXT_TURN_DELAY,
  FLASHCARD_OPTION_LSK,
  SELECTED_STACK_LSK,
} from '../../constants';
import { CardSpread } from '../../components/CardSpread/CardSpread';
import { IconSettings } from '@tabler/icons-react';
import { FlashcardOptions } from './FlashcardOptions';
import { PlayingCard } from '../../types/playingcard';
import { NumberCard } from '../../components/NumberCard';
import { useLocalDb } from '../../utils/localstorage';
import { isPlayingCard } from '../../types/typeguards';
import { addFourDistinctRandomCards } from './pickcards';
import { shuffle } from '../../types/shuffle';
import { notifications } from '@mantine/notifications';
import {
  cardShadow,
  correctAnswerNotification,
  TOGGLE,
  wrongAnswerNotification,
} from './utils';

export const Flashcard = () => {
  const [selectedStack] = useLocalDb(SELECTED_STACK_LSK, 'mnemonica');

  const [card, setCard] = useState<PlayingCardPosition>(
    getRandomPlayingCard(stacks[selectedStack].order),
  );
  const [choices, setChoices] = useState<PlayingCardPosition[]>(
    shuffle(addFourDistinctRandomCards(stacks[selectedStack].order, [card])),
  );

  const [display, setDisplay] = useState<'card' | 'index'>('card');
  const [mode] = useLocalDb(FLASHCARD_OPTION_LSK, 'bothmodes');
  const [options, { open, close }] = useDisclosure(false);

  const clickOnCard = (item: PlayingCard | number) => {
    const correctAnswer = isPlayingCard(item)
      ? item.suit === card.card.suit && item.rank === card.card.rank
      : item === card.index;

    if (correctAnswer === false) {
      notifications.show(wrongAnswerNotification);
    } else {
      notifications.show(correctAnswerNotification);
      setTimeout(() => {
        const newCard = getRandomPlayingCard(stacks[selectedStack].order);
        setCard(newCard);
        setChoices(
          shuffle(
            addFourDistinctRandomCards(stacks[selectedStack].order, [newCard]),
          ),
        );

        if (mode === 'bothmodes') {
          const newDisplay = TOGGLE[Math.floor(Math.random() * TOGGLE.length)];
          setDisplay(newDisplay ?? 'card');
        }
      }, FLASHCARD_NEXT_TURN_DELAY);
    }
  };

  usePageTracking();

  return (
    <>
      <Group justify="space-between" gap="xl">
        <Title order={1}>Flashcard</Title>
        <ActionIcon variant="subtle" color="gray" onClick={open}>
          <IconSettings />
        </ActionIcon>
      </Group>
      <Space h="xl" />
      <Center>
        {mode === 'cardonly' || (mode === 'bothmodes' && display === 'card') ? (
          <Image w="120px" style={cardShadow} src={card.card.image} />
        ) : (
          <NumberCard number={card.index} width={120} fontSize={60} />
        )}
      </Center>
      <Space h="xl" />
      <Space h="xl" />
      <CardSpread
        items={
          mode === 'cardonly' || (mode === 'bothmodes' && display === 'card')
            ? choices.map((c) => c.index)
            : choices.map((c) => c.card)
        }
        canMove={false}
        height="200px"
        onItemClick={clickOnCard}
      />

      <FlashcardOptions opened={options} close={close} />
    </>
  );
};
