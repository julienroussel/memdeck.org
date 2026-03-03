import { useCallback } from "react";

import { SESSION_HISTORY_LSK } from "../constants";
import type { SessionRecord, TrainingMode } from "../types/session";
import type { StackKey } from "../types/stacks";
import { useLocalDb } from "../utils/localstorage";
import { isSessionRecordArray } from "../utils/session-typeguards";

export const useSessionHistory = () => {
  const [history] = useLocalDb<SessionRecord[]>(
    SESSION_HISTORY_LSK,
    [],
    isSessionRecordArray
  );

  const sessionsByMode = useCallback(
    (mode: TrainingMode): SessionRecord[] =>
      history.filter((r) => r.mode === mode),
    [history]
  );

  const sessionsByStack = useCallback(
    (stackKey: StackKey): SessionRecord[] =>
      history.filter((r) => r.stackKey === stackKey),
    [history]
  );

  const sessionsByModeAndStack = useCallback(
    (mode: TrainingMode, stackKey: StackKey): SessionRecord[] =>
      history.filter((r) => r.mode === mode && r.stackKey === stackKey),
    [history]
  );

  return {
    history,
    sessionsByMode,
    sessionsByStack,
    sessionsByModeAndStack,
  };
};
