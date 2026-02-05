import {
  ActionIcon,
  Button,
  Center,
  Grid,
  Group,
  Image,
  NumberInput,
  Space,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconSettings } from "@tabler/icons-react";
import { useCallback, useState } from "react";
import { NumberCard } from "../../components/number-card";
import { TimerDisplay } from "../../components/timer-display";
import { DECK_SIZE } from "../../constants";
import { useRequiredStack } from "../../hooks/use-selected-stack";
import { Score } from "../flashcard/score";
import { AcaanOptions } from "./acaan-options";
import { useAcaanGame } from "./use-acaan-game";

/** Maximum valid cut depth (deck size - 1) */
const MAX_CUT_DEPTH = DECK_SIZE - 1;

/** Validates that cut depth is within valid range (0 to 51) */
const isValidCutDepth = (value: number): boolean =>
  Number.isInteger(value) && value >= 0 && value <= MAX_CUT_DEPTH;

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
  const [cutDepth, setCutDepth] = useState<number | "">("");

  const handleCutDepthChange = useCallback((value: string | number) => {
    setCutDepth(value === "" ? "" : Number(value));
  }, []);

  const handleCheckAnswer = useCallback(() => {
    if (cutDepth === "") {
      return;
    }
    if (!isValidCutDepth(cutDepth)) {
      return;
    }
    submitAnswer(cutDepth);
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
            <TimerDisplay
              timeRemaining={timeRemaining}
              timerDuration={timerDuration}
            />
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
                max={MAX_CUT_DEPTH}
                min={0}
                onChange={handleCutDepthChange}
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
