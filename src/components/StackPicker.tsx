import { Center, NativeSelect } from '@mantine/core';
import { stacks } from '../types/stacks';
import { useLocalStorage } from '@mantine/hooks';
import { SELECTED_STACK_LOCAL_STORAGE_KEY } from '../constants';

export const StackPicker = () => {
  const [stack, setStack] = useLocalStorage({
    key: SELECTED_STACK_LOCAL_STORAGE_KEY,
    defaultValue: '',
  });

  const availableStacks = Object.entries(stacks)
    .map(([key, stack]) => ({
      label: stack.name,
      value: key,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const stackSelection =
    stack !== ''
      ? availableStacks
      : [{ label: 'Please choose a stack', value: '' }, ...availableStacks];

  return (
    <Center>
      <NativeSelect
        value={stack}
        onChange={(event) => setStack(event.currentTarget.value)}
        data={stackSelection}
      />
    </Center>
  );
};
