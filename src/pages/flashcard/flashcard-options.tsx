import { Group, Modal, Radio, Space, Stack, Text, Title } from "@mantine/core";
import { TimerSettingsControl } from "../../components/timer-settings-control";
import { FLASHCARD_OPTION_LSK } from "../../constants";
import { useFlashcardTimer } from "../../hooks/use-flashcard-timer";
import { eventBus } from "../../services/event-bus";
import {
  FLASHCARD_MODE_OPTIONS,
  type FlashcardMode,
  isFlashcardMode,
} from "../../types/flashcard";
import { useLocalDb } from "../../utils/localstorage";

export const FlashcardOptions = ({
  opened,
  close,
}: {
  opened: boolean;
  close: () => void;
}) => {
  const [option, setOption] = useLocalDb<FlashcardMode>(
    FLASHCARD_OPTION_LSK,
    "bothmodes"
  );
  const { timerSettings, setTimerEnabled, setTimerDuration } =
    useFlashcardTimer();

  const handleModeChange = (value: string) => {
    if (!isFlashcardMode(value)) {
      return;
    }
    setOption(value);
    eventBus.emit.FLASHCARD_MODE_CHANGED({ mode: value });
  };

  return (
    <Modal onClose={close} opened={opened} size="xl" withCloseButton={false}>
      <Title order={2}>Flashcard options</Title>
      <Radio.Group
        label="Pick one mode"
        onChange={handleModeChange}
        value={option}
      >
        <Stack gap="xs" pt="md">
          {FLASHCARD_MODE_OPTIONS.map((opt) => (
            <Radio.Card
              className="optionsRadioCard"
              key={opt.value}
              radius="md"
              value={opt.value}
            >
              <Group align="flex-start" wrap="nowrap">
                <Radio.Indicator />
                <div>
                  <Text className="optionsLabel">{opt.label}</Text>
                  <Text className="optionsDescription">{opt.description}</Text>
                </div>
              </Group>
            </Radio.Card>
          ))}
        </Stack>
      </Radio.Group>
      <Space h="xl" />
      <TimerSettingsControl
        onDurationChange={setTimerDuration}
        onEnabledChange={setTimerEnabled}
        timerSettings={timerSettings}
      />
    </Modal>
  );
};
