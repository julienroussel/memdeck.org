import { Button, Group, Space, Stack, Text, Title } from '@mantine/core';
import { useState } from 'react';
import ReactGA from 'react-ga4';
import { getRandomMnemonicaPlayingCard, PlayingCardPosition } from '../stacks';
import { usePageTracking } from '../hooks/usePageTracking';

const TOGGLE = ['card', 'index'] as const;

export const Quiz = () => {
  const [card, setCard] = useState<PlayingCardPosition>(
    getRandomMnemonicaPlayingCard(),
  );
  const [display, setDisplay] = useState<'card' | 'index'>('card');

  usePageTracking();

  const getNextRandomCard = () => {
    setCard(getRandomMnemonicaPlayingCard());

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
