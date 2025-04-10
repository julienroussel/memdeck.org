import {
  ActionIcon,
  Center,
  Grid,
  Group,
  Image,
  Space,
  Title,
} from '@mantine/core';
import { useState } from 'react';
import {
  getRandomPlayingCard,
  PlayingCardPosition,
  stacks,
} from '../../types/stacks';
import { usePageTracking } from '../../hooks/usePageTracking';
import { useDisclosure } from '@mantine/hooks';
import { FLASHCARD_OPTION_LSK, SELECTED_STACK_LSK } from '../../constants';
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
import { TOGGLE, wrongAnswerNotification } from './utils';
import { Score } from './Score';

export const Flashcard = () => {
  const [selectedStack] = useLocalDb(SELECTED_STACK_LSK, 'mnemonica');

  const [successes, setSuccesses] = useState(0);
  const [fails, setFails] = useState(0);

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
      setFails(fails + 1);
    } else {
      setSuccesses(successes + 1);

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
    }
  };

  usePageTracking();

  return (
    <div className="fullMantineContainerHeight">
      <Grid
        gutter={0}
        overflow="hidden"
        style={{
          display: 'grid',
          height: '100%',
        }}
      >
        <Grid.Col span={12}>
          <Group justify="space-between" gap="xs">
            <Title order={1}>Flashcard</Title>
            <Group gap="xs">
              <Score successes={successes} fails={fails} />
              <ActionIcon variant="subtle" color="gray" onClick={open}>
                <IconSettings />
              </ActionIcon>
            </Group>
          </Group>
        </Grid.Col>
        <Grid.Col span={12}>
          <Space h="xl" />
          <Center>
            {mode === 'cardonly' ||
            (mode === 'bothmodes' && display === 'card') ? (
              <Image w="120px" className="cardShadow" src={card.card.image} />
            ) : (
              <NumberCard number={card.index} width={120} fontSize={60} />
            )}
          </Center>
          <Space h="xl" />
        </Grid.Col>
        <Grid.Col span={12} style={{ height: '100%' }}>
          <CardSpread
            items={
              mode === 'cardonly' ||
              (mode === 'bothmodes' && display === 'card')
                ? choices.map((c) => c.index)
                : choices.map((c) => c.card)
            }
            canMove={false}
            onItemClick={clickOnCard}
            hasCursor={true}
          />
          <FlashcardOptions opened={options} close={close} />
        </Grid.Col>
      </Grid>
    </div>
  );
};
