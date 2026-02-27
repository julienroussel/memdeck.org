import { useCallback, useMemo } from "react";

import { SESSION_HISTORY_LSK } from "../constants";
import type { SessionRecord, TrainingMode } from "../types/session";
import type { StackKey } from "../types/stacks";
import { useLocalDb } from "../utils/localstorage";
import { isSessionRecordArray } from "../utils/session-typeguards";

export const useSessionHistory = () => {
  const [history] = useLocalDb<SessionRecord[]>(SESSION_HISTORY_LSK, []);

  const validHistory = useMemo(
    () => (isSessionRecordArray(history) ? history : []),
    [history]
  );

  const sessionsByMode = useCallback(
    (mode: TrainingMode): SessionRecord[] =>
      validHistory.filter((r) => r.mode === mode),
    [validHistory]
  );

  const sessionsByStack = useCallback(
    (stackKey: StackKey): SessionRecord[] =>
      validHistory.filter((r) => r.stackKey === stackKey),
    [validHistory]
  );

  const sessionsByModeAndStack = useCallback(
    (mode: TrainingMode, stackKey: StackKey): SessionRecord[] =>
      validHistory.filter((r) => r.mode === mode && r.stackKey === stackKey),
    [validHistory]
  );

  return {
    history: validHistory,
    sessionsByMode,
    sessionsByStack,
    sessionsByModeAndStack,
  };
};
