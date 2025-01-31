import { Button, Group, Space, Stack, Text, Title } from '@mantine/core';
import { useState } from 'react';
import { getRandomMnemonicaPlayingCard, PlayingCardPosition } from '../stacks';

const TOGGLE = ['card', 'index'] as const;

export const Quiz = () => {
  const [card, setCard] = useState<PlayingCardPosition>(
    getRandomMnemonicaPlayingCard(),
  );
  const [display, setDisplay] = useState<'card' | 'index'>('card');

  const getNextRandomCard = () => {
    setCard(getRandomMnemonicaPlayingCard());

    const newDisplay = TOGGLE[Math.floor(Math.random() * TOGGLE.length)];
    setDisplay(newDisplay ?? 'card');
  };

  const toggleDisplay = () => {
    setDisplay(display === 'card' ? 'index' : 'card');
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
