import {
  Group,
  Modal,
  SegmentedControl,
  Stack,
  Switch,
  Text,
  Title,
} from "@mantine/core";
import { useAcaanTimer } from "../../hooks/use-acaan-timer";

const TIMER_DURATION_OPTIONS: { label: string; value: string }[] = [
  { label: "10s", value: "10" },
  { label: "15s", value: "15" },
  { label: "30s", value: "30" },
];

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
    if (numValue === 10 || numValue === 15 || numValue === 30) {
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
