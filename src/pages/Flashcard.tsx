import {
  Button,
  Center,
  Group,
  Space,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useState } from 'react';
import ReactGA from 'react-ga4';
import {
  getRandomPlayingCard,
  PlayingCardPosition,
  stacks,
} from '../types/stacks';
import { usePageTracking } from '../hooks/usePageTracking';
import { readLocalStorageValue, useLocalStorage } from '@mantine/hooks';
import { SELECTED_STACK_LOCAL_STORAGE_KEY } from '../constants';

const TOGGLE = ['card', 'index'] as const;

export const Flashcard = () => {
  const [stack] = useLocalStorage({
    key: SELECTED_STACK_LOCAL_STORAGE_KEY,
    defaultValue:
      readLocalStorageValue({ key: SELECTED_STACK_LOCAL_STORAGE_KEY }) ??
      'mnemonica',
  });
  const [card, setCard] = useState<PlayingCardPosition>(
    getRandomPlayingCard(stacks[stack].order),
  );
  const [display, setDisplay] = useState<'card' | 'index'>('card');

  usePageTracking();

  const getNextRandomCard = () => {
    setCard(getRandomPlayingCard(stacks[stack].order));

    const newDisplay = TOGGLE[Math.floor(Math.random() * TOGGLE.length)];
    setDisplay(newDisplay ?? 'card');

    ReactGA.event({
      category: 'Flashcard',
      action: 'Clicked next button',
    });
  };

  const toggleDisplay = () => {
    setDisplay(display === 'card' ? 'index' : 'card');

    ReactGA.event({
      category: 'Flashcard',
      action: 'Clicked turn button',
    });
  };

  return (
    <div>
      <Title order={1}>Flashcard</Title>
      <Stack align="center" justify="center" gap="xl">
        <Center mah={400} maw={400}>
          {display === 'card' ? (
            <Text size="14em">{card.card}</Text>
          ) : (
            <Text size="8em">{card.index}</Text>
          )}
        </Center>
        <Group>
          <Button variant="default" onClick={toggleDisplay}>
            Turn
          </Button>
          <Button variant="default" onClick={getNextRandomCard}>
            Next
          </Button>
        </Group>
        <Space h="md" />
      </Stack>
    </div>
  );
};
