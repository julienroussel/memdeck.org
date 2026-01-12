import { Center, NativeSelect } from "@mantine/core";
import { useSelectedStack } from "../hooks/use-selected-stack";
import { stacks } from "../types/stacks";

export const StackPicker = () => {
  const { stackKey, setStackKey } = useSelectedStack();

  const availableStacks = Object.entries(stacks)
    .map(([key, stack]) => ({
      label: stack.name,
      value: key,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const stackSelection =
    stackKey !== ""
      ? availableStacks
      : [{ label: "Please choose a stack", value: "" }, ...availableStacks];

  return (
    <Center>
      <NativeSelect
        data={stackSelection}
        onChange={(event) => setStackKey(event.currentTarget.value)}
        value={stackKey}
      />
    </Center>
  );
};
