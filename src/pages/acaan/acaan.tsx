import {
  ActionIcon,
  Button,
  Center,
  Grid,
  Group,
  Image,
  NumberInput,
  Progress,
  Space,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconSettings } from "@tabler/icons-react";
import { useCallback, useState } from "react";
import { NumberCard } from "../../components/number-card";
import { DECK_SIZE } from "../../constants";
import { useRequiredStack } from "../../hooks/use-selected-stack";
import { Score } from "../flashcard/score";
import { AcaanOptions } from "./acaan-options";
import { useAcaanGame } from "./use-acaan-game";

const getTimerColor = (timeRemaining: number): string => {
  if (timeRemaining <= 3) {
    return "red";
  }
  if (timeRemaining <= 5) {
    return "yellow";
  }
  return "blue";
};

export const Acaan = () => {
  const { stackOrder } = useRequiredStack();
  const {
    scenario,
    score,
    timeRemaining,
    timerEnabled,
    timerDuration,
    submitAnswer,
  } = useAcaanGame(stackOrder);
  const [options, { open, close }] = useDisclosure(false);
  const [cutDepth, setCutDepth] = useState<number | string>("");

  const handleCheckAnswer = useCallback(() => {
    if (cutDepth === "") {
      return;
    }
    const answer = typeof cutDepth === "string" ? Number(cutDepth) : cutDepth;
    submitAnswer(answer);
    setCutDepth("");
  }, [cutDepth, submitAnswer]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Enter" && cutDepth !== "") {
        handleCheckAnswer();
      }
    },
    [cutDepth, handleCheckAnswer]
  );

  const timerProgress = (timeRemaining / timerDuration) * 100;
  const timerColor = getTimerColor(timeRemaining);

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
            <Title order={1}>ACAAN</Title>
            <Group gap="xs">
              <Score fails={score.fails} successes={score.successes} />
              <ActionIcon color="gray" onClick={open} variant="subtle">
                <IconSettings />
              </ActionIcon>
            </Group>
          </Group>
        </Grid.Col>
        <Grid.Col span={12}>
          <Space h="xl" />
          {timerEnabled && (
            <>
              <Center>
                <div style={{ width: 300 }}>
                  <Group gap="xs" justify="space-between">
                    <Text c={timerColor} fw={500} size="sm">
                      Time remaining
                    </Text>
                    <Text c={timerColor} fw={700} size="lg">
                      {timeRemaining}s
                    </Text>
                  </Group>
                  <Progress
                    animated={timeRemaining > 0}
                    color={timerColor}
                    size="lg"
                    value={timerProgress}
                  />
                </div>
              </Center>
              <Space h="lg" />
            </>
          )}
          <Center>
            <Group align="center" gap="xl">
              <Image
                className="cardShadow"
                src={scenario.card.image}
                w="120px"
              />
              <Title order={2}>→</Title>
              <NumberCard
                fontSize={60}
                number={scenario.targetPosition}
                width={120}
              />
            </Group>
          </Center>
          <Space h="xl" />
          <Center>
            <Group gap="md">
              <NumberInput
                allowDecimal={false}
                allowNegative={false}
                max={DECK_SIZE}
                min={1}
                onChange={setCutDepth}
                onKeyDown={handleKeyDown}
                placeholder="Cut depth"
                size="md"
                value={cutDepth}
                w={140}
              />
              <Button
                disabled={cutDepth === ""}
                onClick={handleCheckAnswer}
                size="md"
              >
                Check
              </Button>
            </Group>
          </Center>
        </Grid.Col>
        <Grid.Col span={12} style={{ height: "100%" }}>
          <AcaanOptions close={close} opened={options} />
        </Grid.Col>
      </Grid>
    </div>
  );
};
