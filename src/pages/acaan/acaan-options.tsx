import { Modal, Stack, Title } from "@mantine/core";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();

  return (
    <Modal onClose={close} opened={opened} size="xl" withCloseButton={false}>
      <Title order={2}>{t("acaan.optionsTitle")}</Title>
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
