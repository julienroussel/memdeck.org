import { Center, Group, Progress, Space, Text } from "@mantine/core";
import { memo } from "react";
import { calculateTimerProgress, getTimerColor } from "../utils/timer";

const TIMER_WIDTH = 300;

type TimerDisplayProps = {
  timeRemaining: number;
  timerDuration: number;
};

/**
 * Displays a countdown timer with progress bar.
 * Shows time remaining with color-coded urgency indicators.
 * Memoized to prevent unnecessary re-renders from parent components.
 */
export const TimerDisplay = memo(function TimerDisplay({
  timerDuration,
  timeRemaining,
}: TimerDisplayProps) {
  const timerProgress = calculateTimerProgress(timeRemaining, timerDuration);
  const timerColor = getTimerColor(timeRemaining);

  return (
    <>
      <Center>
        <div style={{ width: TIMER_WIDTH }}>
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
  );
});
