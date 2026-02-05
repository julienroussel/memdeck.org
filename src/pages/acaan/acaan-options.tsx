import {
  Group,
  Modal,
  SegmentedControl,
  Stack,
  Switch,
  Text,
  Title,
} from "@mantine/core";
import { type TimerDuration, useAcaanTimer } from "../../hooks/use-acaan-timer";

const VALID_DURATIONS: readonly TimerDuration[] = [10, 15, 30];

const TIMER_DURATION_OPTIONS: { label: string; value: string }[] =
  VALID_DURATIONS.map((d) => ({ label: `${d}s`, value: String(d) }));

const isValidDuration = (value: number): value is TimerDuration =>
  VALID_DURATIONS.includes(value as TimerDuration);

export const AcaanOptions = ({
  opened,
  close,
}: {
  opened: boolean;
  close: () => void;
}) => {
  const { timerSettings, setTimerEnabled, setTimerDuration } = useAcaanTimer();

  const handleTimerToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTimerEnabled(event.currentTarget.checked);
  };

  const handleDurationChange = (value: string) => {
    const numValue = Number(value);
    if (isValidDuration(numValue)) {
      setTimerDuration(numValue);
    }
  };

  return (
    <Modal onClose={close} opened={opened} size="xl" withCloseButton={false}>
      <Title order={2}>ACAAN options</Title>
      <Stack gap="md" pt="md">
        <Switch
          checked={timerSettings.enabled}
          label="Timed mode"
          onChange={handleTimerToggle}
        />
        {timerSettings.enabled && (
          <Group gap="xs">
            <Text size="sm">Time limit:</Text>
            <SegmentedControl
              data={TIMER_DURATION_OPTIONS}
              onChange={handleDurationChange}
              size="xs"
              value={String(timerSettings.duration)}
            />
          </Group>
        )}
      </Stack>
    </Modal>
  );
};
