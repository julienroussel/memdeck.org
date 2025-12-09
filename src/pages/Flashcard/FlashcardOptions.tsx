import { Group, Modal, Radio, Stack, Text, Title } from '@mantine/core';
import { FLASHCARD_OPTION_LSK } from '../../constants';
import { useLocalDb } from '../../utils/localstorage';

const FLASHCARD_MODE_OPTIONS = [
  {
    value: 'cardonly',
    label: 'Card only',
    description:
      "In this mode, you'll see a card and need to guess its position in the stack from 5 options.",
  },
  {
    value: 'bothmodes',
    label: 'Both modes',
    description:
      "In this mode, you'll be randomly shown either a card or a number, guess its match from 5 options.",
  },
  {
    value: 'numberonly',
    label: 'Number only',
    description:
      "In this mode, you'll see a number and need to pick the corresponding card from 5 options.",
  },
] as const;

export const FlashcardOptions = ({
  opened,
  close,
}: {
  opened: boolean;
  close: () => void;
}) => {
  const [option, setOption] = useLocalDb(FLASHCARD_OPTION_LSK, 'bothmodes');

  return (
    <Modal opened={opened} onClose={close} withCloseButton={false} size="auto">
      <Title order={2}>Flashcard options</Title>
      <Radio.Group value={option} onChange={setOption} label="Pick one mode">
        <Stack pt="md" gap="xs">
          {FLASHCARD_MODE_OPTIONS.map((opt) => (
            <Radio.Card
              radius="md"
              value={opt.value}
              key={opt.value}
              className="optionsRadioCard"
            >
              <Group wrap="nowrap" align="flex-start">
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
    </Modal>
  );
};
