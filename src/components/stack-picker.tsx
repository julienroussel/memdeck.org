import { Center, NativeSelect } from "@mantine/core";
import { useSelectedStack } from "../hooks/use-selected-stack";
import { type StackKey, stacks } from "../types/stacks";

export const StackPicker = () => {
  const { stackKey, setStackKey } = useSelectedStack();

  const availableStacks = Object.entries(stacks)
    .map(([key, stack]) => ({
      label: stack.name,
      value: key,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const handleStackChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.currentTarget.value;
    if (value in stacks) {
      setStackKey(value as StackKey);
    }
  };

  return (
    <Center>
      <NativeSelect
        data={availableStacks}
        onChange={handleStackChange}
        value={stackKey}
      />
    </Center>
  );
};
