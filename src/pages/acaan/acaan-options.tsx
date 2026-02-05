import { Modal, Stack, Title } from "@mantine/core";
import { TimerSettingsControl } from "../../components/timer-settings-control";
import { useAcaanTimer } from "../../hooks/use-acaan-timer";

export const AcaanOptions = ({
  opened,
  close,
}: {
  opened: boolean;
  close: () => void;
}) => {
  const { timerSettings, setTimerEnabled, setTimerDuration } = useAcaanTimer();

  return (
    <Modal onClose={close} opened={opened} size="xl" withCloseButton={false}>
      <Title order={2}>ACAAN options</Title>
      <Stack gap="md" pt="md">
        <TimerSettingsControl
          onDurationChange={setTimerDuration}
          onEnabledChange={setTimerEnabled}
          timerSettings={timerSettings}
        />
      </Stack>
    </Modal>
  );
};
