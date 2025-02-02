import { Button, Group, Space, Stack, Text, Title } from '@mantine/core';
import { useState } from 'react';
import ReactGA from 'react-ga4';
import { getRandomPlayingCard, PlayingCardPosition, stacks } from '../stacks';
import { usePageTracking } from '../hooks/usePageTracking';
import { readLocalStorageValue, useLocalStorage } from '@mantine/hooks';

const TOGGLE = ['card', 'index'] as const;

export const Quiz = () => {
  const [stack] = useLocalStorage({
    key: 'stack',
    defaultValue: readLocalStorageValue({ key: 'stack' }) ?? 'mnemonica',
  });
  console.log(stack);
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
      category: 'Quiz',
      action: 'Clicked next button',
    });
  };

  const toggleDisplay = () => {
    setDisplay(display === 'card' ? 'index' : 'card');

    ReactGA.event({
      category: 'Quiz',
      action: 'Clicked turn button',
    });
  };

  return (
    <div>
      <Title order={1}>Quiz</Title>
      <Stack align="center" justify="center" gap="xl">
        {display === 'card' ? (
          <Text size="30vw">{card.card}</Text>
        ) : (
          <Text size="30vw">{card.index}</Text>
        )}
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
