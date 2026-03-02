import { Center, Group, Progress, Space, Text } from "@mantine/core";
import { memo } from "react";
import { useTranslation } from "react-i18next";
import { calculateTimerProgress, getTimerColor } from "../utils/timer";

const TIMER_MAX_WIDTH = 300;

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
  const { t } = useTranslation();

  return (
    <>
      <Center>
        <div style={{ width: "100%", maxWidth: TIMER_MAX_WIDTH }}>
          <Group gap="xs" justify="space-between">
            <Text c={timerColor} fw={500} size="sm">
              {t("timer.timeRemaining")}
            </Text>
            <Text c={timerColor} fw={700} size="lg">
              {timeRemaining}s
            </Text>
          </Group>
          <Progress.Root size="lg">
            <Progress.Section
              animated={timeRemaining > 0}
              aria-label={`${t("timer.timeRemaining")}: ${timeRemaining}s`}
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={timerProgress}
              aria-valuetext={`${timeRemaining}s`}
              color={timerColor}
              role="progressbar"
              value={timerProgress}
              withAria={false}
            />
          </Progress.Root>
        </div>
      </Center>
      <Space h="lg" />
    </>
  );
});
