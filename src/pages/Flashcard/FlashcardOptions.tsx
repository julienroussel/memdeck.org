import { Group, Modal, Radio, Stack, Text, Title } from '@mantine/core';
import { FLASHCARD_OPTION_LSK } from '../../constants';
import { useLocalDb } from '../../utils/localstorage';

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
          <Radio.Card
            radius="md"
            value="cardonly"
            key="cardonly"
            className="optionsRadioCard"
          >
            <Group wrap="nowrap" align="flex-start">
              <Radio.Indicator />
              <div>
                <Text className="optionsLabel">Card only</Text>
                <Text className="optionsDescription">
                  In this mode, you'll see a card and need to guess its position
                  in the stack from 5 options.
                </Text>
              </div>
            </Group>
          </Radio.Card>
          <Radio.Card
            radius="md"
            value="bothmodes"
            key="bothmodes"
            className="optionsRadioCard"
          >
            <Group wrap="nowrap" align="flex-start">
              <Radio.Indicator />
              <div>
                <Text className="optionsLabel">Both modes</Text>
                <Text className="optionsDescription">
                  In this mode, you'll be randomly shown either a card or a
                  number, guess its match from 5 options.
                </Text>
              </div>
            </Group>
          </Radio.Card>
          <Radio.Card
            radius="md"
            value="numberonly"
            key="numberonly"
            className="optionsRadioCard"
          >
            <Group wrap="nowrap" align="flex-start">
              <Radio.Indicator />
              <div>
                <Text className="optionsLabel">Number only</Text>
                <Text className="optionsDescription">
                  In this mode, you'll see a number and need to pick the
                  corresponding card from 5 options.
                </Text>
              </div>
            </Group>
          </Radio.Card>
        </Stack>
      </Radio.Group>
    </Modal>
  );
};
