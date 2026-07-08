import { useCallback, useState } from "react";

import { SESSION_HISTORY_LSK } from "../constants";
import type { SessionRecord, TrainingMode } from "../types/session";
import type { StackKey } from "../types/stacks";
import { type LocalDbStatus, useLocalDb } from "../utils/localstorage";
import { reportLocalDbCorruption } from "../utils/localstorage-telemetry";
import { isSessionRecordArray } from "../utils/session-typeguards";

type UseSessionHistoryResult = {
  history: SessionRecord[];
  historyStatus: LocalDbStatus;
  sessionsByMode: (mode: TrainingMode) => SessionRecord[];
  sessionsByStack: (stackKey: StackKey) => SessionRecord[];
  sessionsByModeAndStack: (
    mode: TrainingMode,
    stackKey: StackKey
  ) => SessionRecord[];
};

export const useSessionHistory = (): UseSessionHistoryResult => {
  const [historyStatus, setHistoryStatus] = useState<LocalDbStatus>("ready");
  const [history] = useLocalDb<SessionRecord[]>(
    SESSION_HISTORY_LSK,
    [],
    isSessionRecordArray,
    {
      onCorrupt: (key, error) => {
        reportLocalDbCorruption(key, error);
        setHistoryStatus("corrupt");
      },
    }
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
    historyStatus,
    sessionsByMode,
    sessionsByModeAndStack,
    sessionsByStack,
  };
};
