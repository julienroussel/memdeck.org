import { Center, Group, Progress, Space, Text } from "@mantine/core";
import { memo } from "react";
import { useTranslation } from "react-i18next";
import { calculateTimerProgress, getTimerColor } from "../utils/timer";

const TIMER_MAX_WIDTH = 300;

// Darker text shades for the urgent states: the default yellow-6/red-6 fail
// WCAG 1.4.3 contrast on a light background exactly when time is short.
const TIMER_TEXT_COLORS: Record<string, string> = {
  // No Mantine yellow shade reaches 4.5:1 on white (yellow-9 is ~3:1), so the
  // light side uses a custom dark amber (#996300 ≈ 4.9:1 on white).
  yellow: "light-dark(#996300, var(--mantine-color-yellow-4))",
  red: "light-dark(var(--mantine-color-red-9), var(--mantine-color-red-4))",
};

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
  const timerTextColor = TIMER_TEXT_COLORS[timerColor] ?? timerColor;
  const { t } = useTranslation();
  const isUrgent = timeRemaining === 5 || timeRemaining === 1;

  return (
    <>
      <Center>
        <div style={{ width: "100%", maxWidth: TIMER_MAX_WIDTH }}>
          <Group gap="xs" justify="space-between">
            <Text c={timerTextColor} fw={500} size="sm">
              {t("timer.timeRemaining")}
            </Text>
            <Text c={timerTextColor} fw={700} size="lg">
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
          <span aria-live="assertive" className="sr-only">
            {isUrgent ? `${t("timer.timeRemaining")}: ${timeRemaining}s` : ""}
          </span>
        </div>
      </Center>
      <Space h="lg" />
    </>
  );
});
