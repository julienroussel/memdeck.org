import { Center, NativeSelect } from "@mantine/core";
import { memo, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSelectedStack } from "../hooks/use-selected-stack";
import { eventBus } from "../services/event-bus";
import { stacks } from "../types/stacks";

const availableStacks = Object.entries(stacks)
  .map(([key, stack]) => ({
    label: stack.name,
    value: key,
  }))
  .sort((a, b) => a.label.localeCompare(b.label));

export const StackPicker = memo(function StackPicker() {
  const { stackKey, setStackKey } = useSelectedStack();
  const { t } = useTranslation();

  const stackSelection = useMemo(
    () =>
      stackKey !== ""
        ? availableStacks
        : [
            { label: t("stackPicker.placeholder"), value: "" },
            ...availableStacks,
          ],
    [stackKey, t]
  );

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const value = event.currentTarget.value;
      setStackKey(value);
      if (value) {
        const selectedStack = availableStacks.find((s) => s.value === value);
        if (selectedStack) {
          eventBus.emit.STACK_SELECTED({ stackName: selectedStack.label });
        }
      }
    },
    [setStackKey]
  );

  return (
    <Center>
      <NativeSelect
        aria-label={t("stackPicker.ariaLabel")}
        data={stackSelection}
        data-testid="stack-picker"
        onChange={handleChange}
        value={stackKey}
      />
    </Center>
  );
});
