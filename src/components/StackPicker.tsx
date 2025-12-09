import { Center, NativeSelect } from '@mantine/core';
import { stacks } from '../types/stacks';
import { useSelectedStack } from '../hooks/useSelectedStack';

export const StackPicker = () => {
  const { stackKey, setStackKey } = useSelectedStack();

  const availableStacks = Object.entries(stacks)
    .map(([key, stack]) => ({
      label: stack.name,
      value: key,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const stackSelection =
    stackKey !== ''
      ? availableStacks
      : [{ label: 'Please choose a stack', value: '' }, ...availableStacks];

  return (
    <Center>
      <NativeSelect
        value={stackKey}
        onChange={(event) => setStackKey(event.currentTarget.value)}
        data={stackSelection}
      />
    </Center>
  );
};
