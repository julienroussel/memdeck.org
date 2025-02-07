import { Center, NativeSelect } from '@mantine/core';
import { stacks } from '../types/stacks';
import { SELECTED_STACK_LSK } from '../constants';
import { useLocalDb } from '../utils/localstorage';

export const StackPicker = () => {
  const [stack, setStack] = useLocalDb(SELECTED_STACK_LSK);

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
