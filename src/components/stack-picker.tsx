import { Center, NativeSelect } from "@mantine/core";
import { memo, useMemo } from "react";
import { useSelectedStack } from "../hooks/use-selected-stack";
import { stacks } from "../types/stacks";

const availableStacks = Object.entries(stacks)
  .map(([key, stack]) => ({
    label: stack.name,
    value: key,
  }))
  .sort((a, b) => a.label.localeCompare(b.label));

export const StackPicker = memo(function StackPicker() {
  const { stackKey, setStackKey } = useSelectedStack();

  const stackSelection = useMemo(
    () =>
      stackKey !== ""
        ? availableStacks
        : [{ label: "Please choose a stack", value: "" }, ...availableStacks],
    [stackKey]
  );

  const handleStackChange = (value: string) => {
    setStackKey(value);
    if (value) {
      const selectedStack = availableStacks.find((s) => s.value === value);
      if (selectedStack) {
        import("../services/analytics").then(({ analytics }) => {
          analytics.trackStackSelected(selectedStack.label);
        });
      }
    }
  };

  return (
    <Center>
      <NativeSelect
        data={stackSelection}
        onChange={(event) => handleStackChange(event.currentTarget.value)}
        value={stackKey}
      />
    </Center>
  );
});
