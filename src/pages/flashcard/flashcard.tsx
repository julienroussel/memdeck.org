import {
  ActionIcon,
  Center,
  Grid,
  Group,
  Image,
  Space,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconSettings } from "@tabler/icons-react";
import { useState } from "react";
import { CardSpread } from "../../components/card-spread/card-spread";
import { NumberCard } from "../../components/number-card";
import { FLASHCARD_OPTION_LSK } from "../../constants";
import { useSelectedStack } from "../../hooks/use-selected-stack";
import type { PlayingCard } from "../../types/playingcard";
import { shuffle } from "../../types/shuffle";
import {
  getRandomPlayingCard,
  type PlayingCardPosition,
  type Stack,
} from "../../types/stacks";
import { isPlayingCard } from "../../types/typeguards";
import { generateUniqueCardChoices } from "../../utils/card-selection";
import { useLocalDb } from "../../utils/localstorage";
import { type FlashcardMode, FlashcardOptions } from "./flashcard-options";
import { Score } from "./score";
import { TOGGLE, wrongAnswerNotification } from "./utils";

const generateNewCardAndChoices = (
  stackOrder: Stack
): { card: PlayingCardPosition; choices: PlayingCardPosition[] } => {
  const newCard = getRandomPlayingCard(stackOrder);
  const newChoices = shuffle(generateUniqueCardChoices(stackOrder, [newCard]));
  return { card: newCard, choices: newChoices };
};

const isCorrectAnswer = (
  item: PlayingCard | number,
  card: PlayingCardPosition
): boolean =>
  isPlayingCard(item)
    ? item.suit === card.card.suit && item.rank === card.card.rank
    : item === card.index;

export const Flashcard = () => {
  const { stackOrder } = useSelectedStack();

  const [successes, setSuccesses] = useState(0);
  const [fails, setFails] = useState(0);

  const initial = generateNewCardAndChoices(stackOrder);
  const [card, setCard] = useState<PlayingCardPosition>(initial.card);
  const [choices, setChoices] = useState<PlayingCardPosition[]>(
    initial.choices
  );

  const [display, setDisplay] = useState<"card" | "index">("card");
  const [mode] = useLocalDb<FlashcardMode>(FLASHCARD_OPTION_LSK, "bothmodes");
  const [options, { open, close }] = useDisclosure(false);

  const handleWrongAnswer = () => {
    notifications.show(wrongAnswerNotification);
    setFails(fails + 1);
  };

  const handleCorrectAnswer = () => {
    setSuccesses(successes + 1);

    const { card: newCard, choices: newChoices } =
      generateNewCardAndChoices(stackOrder);
    setCard(newCard);
    setChoices(newChoices);

    if (mode === "bothmodes") {
      const newDisplay = TOGGLE[Math.floor(Math.random() * TOGGLE.length)];
      setDisplay(newDisplay ?? "card");
    }
  };

  const clickOnCard = (item: PlayingCard | number) => {
    if (isCorrectAnswer(item, card)) {
      handleCorrectAnswer();
    } else {
      handleWrongAnswer();
    }
  };

  const shouldShowCard =
    mode === "cardonly" || (mode === "bothmodes" && display === "card");

  return (
    <div className="fullMantineContainerHeight">
      <Grid
        gutter={0}
        overflow="hidden"
        style={{
          display: "grid",
          height: "100%",
        }}
      >
        <Grid.Col span={12}>
          <Group gap="xs" justify="space-between">
            <Title order={1}>Flashcard</Title>
            <Group gap="xs">
              <Score fails={fails} successes={successes} />
              <ActionIcon color="gray" onClick={open} variant="subtle">
                <IconSettings />
              </ActionIcon>
            </Group>
          </Group>
        </Grid.Col>
        <Grid.Col span={12}>
          <Space h="xl" />
          <Center>
            {shouldShowCard ? (
              <Image className="cardShadow" src={card.card.image} w="120px" />
            ) : (
              <NumberCard fontSize={60} number={card.index} width={120} />
            )}
          </Center>
          <Space h="xl" />
        </Grid.Col>
        <Grid.Col span={12} style={{ height: "100%" }}>
          <CardSpread
            canMove={false}
            hasCursor={true}
            items={
              shouldShowCard
                ? choices.map((c) => c.index)
                : choices.map((c) => c.card)
            }
            onItemClick={clickOnCard}
          />
          <FlashcardOptions close={close} opened={options} />
        </Grid.Col>
      </Grid>
    </div>
  );
};
