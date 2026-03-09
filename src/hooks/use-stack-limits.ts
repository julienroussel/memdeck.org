import { useCallback, useMemo } from "react";
import { STACK_LIMITS_LSK } from "../constants";
import {
  DEFAULT_STACK_LIMITS,
  getRangeSize,
  isFullDeck,
  isStackLimitsRecord,
  type StackLimits,
  type StackLimitsRecord,
} from "../types/stack-limits";
import { createDeckPosition, type StackKey } from "../types/stacks";
import { useLocalDb } from "../utils/localstorage";

type UseStackLimitsResult = {
  limits: StackLimits;
  setLimits: (limits: StackLimits) => void;
  rangeSize: number;
  isFullDeck: boolean;
};

export const useStackLimits = (stackKey: StackKey): UseStackLimitsResult => {
  const [record, setRecord] = useLocalDb<StackLimitsRecord>(
    STACK_LIMITS_LSK,
    {},
    isStackLimitsRecord
  );

  const rawStart = record[stackKey]?.start;
  const rawEnd = record[stackKey]?.end;
  const limits: StackLimits = useMemo(
    () =>
      rawStart !== undefined && rawEnd !== undefined
        ? {
            start: createDeckPosition(rawStart),
            end: createDeckPosition(rawEnd),
          }
        : DEFAULT_STACK_LIMITS,
    [rawStart, rawEnd]
  );

  const handleSetLimits = useCallback(
    (newLimits: StackLimits) => {
      setRecord((prev) => ({
        ...prev,
        [stackKey]: {
          start: newLimits.start,
          end: newLimits.end,
        },
      }));
    },
    [stackKey, setRecord]
  );

  const rangeSize = getRangeSize(limits);
  const full = isFullDeck(limits);

  return {
    limits,
    setLimits: handleSetLimits,
    rangeSize,
    isFullDeck: full,
  };
};
