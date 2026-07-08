import { NativeSelect } from "@mantine/core";
import { memo, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { isStackKey, useSelectedStack } from "../hooks/use-selected-stack";
import { eventBus } from "../services/event-bus";
import { stacks } from "../types/stacks";

const availableStacks = Object.entries(stacks)
  .map(([key, stack]) => ({
    label: stack.name,
    value: key,
  }))
  .sort((a, b) => a.label.localeCompare(b.label));

export const StackPicker = memo(() => {
  const { stackKey, setStackKey } = useSelectedStack();
  const { t } = useTranslation();

  const stackSelection = useMemo(
    () =>
      stackKey === ""
        ? [
            { label: t("stackPicker.placeholder"), value: "" },
            ...availableStacks,
          ]
        : availableStacks,
    [stackKey, t]
  );

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const { value } = event.currentTarget;
      const narrowed = isStackKey(value) ? value : "";
      setStackKey(narrowed);
      if (narrowed !== "") {
        const selectedStack = availableStacks.find((s) => s.value === narrowed);
        if (selectedStack) {
          eventBus.emit.STACK_SELECTED({ stackName: selectedStack.label });
        }
      }
    },
    [setStackKey]
  );

  return (
    <NativeSelect
      aria-label={t("stackPicker.ariaLabel")}
      data={stackSelection}
      data-testid="stack-picker"
      onChange={handleChange}
      value={stackKey}
    />
  );
});

StackPicker.displayName = "StackPicker";
