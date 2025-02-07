import { Group, Modal, Radio, Stack, Text, Title } from '@mantine/core';
import { FLASHCARD_OPTION_LSK } from '../../constants';
import { useLocalDb } from '../../utils/localstorage';
import { CSSProperties } from 'react';

const radioCardStyle: CSSProperties = {
  position: 'relative',
  padding: 'var(--mantine-spacing-md)',
  transition: 'border-color 150ms ease',
};

const labelStyle: CSSProperties = {
  fontFamily: 'var(--mantine-font-family-monospace)',
  fontWeight: 'bold',
  fontSize: 'var(--mantine-font-size-md)',
  lineHeight: '1.3',
  color: 'var(--mantine-color-bright)',
};

const descriptionStyle: CSSProperties = {
  marginTop: '8px',
  color: 'var(--mantine-color-dimmed)',
  fontSize: 'var(--mantine-font-size-xs)',
};

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
            style={radioCardStyle}
          >
            <Group wrap="nowrap" align="flex-start">
              <Radio.Indicator />
              <div>
                <Text style={labelStyle}>Card only</Text>
                <Text style={descriptionStyle}>
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
            style={radioCardStyle}
          >
            <Group wrap="nowrap" align="flex-start">
              <Radio.Indicator />
              <div>
                <Text style={labelStyle}>Both modes</Text>
                <Text style={descriptionStyle}>
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
            style={radioCardStyle}
          >
            <Group wrap="nowrap" align="flex-start">
              <Radio.Indicator />
              <div>
                <Text style={labelStyle}>Number only</Text>
                <Text style={descriptionStyle}>
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
