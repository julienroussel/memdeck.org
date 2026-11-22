import { useCallback, useMemo } from "react";
import { FOCUS_POSITIONS_LSK } from "../../constants";
import { useStackLimits } from "../../hooks/use-stack-limits";
import { analytics } from "../../services/analytics";
import type { DeckPosition, StackKey } from "../../types/stacks";
import { stacks } from "../../types/stacks";
import { isFocusPositionList } from "../../utils/focus-positions";
import { useLocalDb } from "../../utils/localstorage";
import {
  handleLocalDbWriteFailed,
  reportLocalDbCorruption,
} from "../../utils/localstorage-telemetry";
import type { SessionScope } from "../../utils/session-scope";
import type { FlashcardPool } from "./flashcard-pool";
import { getPoolSize } from "./flashcard-pool";

const NO_FOCUS: readonly DeckPosition[] = [];

type UseFlashcardPoolResult = {
  pool: FlashcardPool;
  poolSize: number;
  focusPositions: readonly DeckPosition[];
  /** Persists the focus list for the current stack; an empty list clears it. */
  setFocusPositions: (positions: readonly DeckPosition[]) => void;
  /** What `useSession` records: the range, or the focus list in its place. Spread into its options. */
  sessionScope: SessionScope;
};

/**
 * Flashcard's question pool: the stack's focus list while one is set, the
 * global stack range otherwise. The list is stored under one key per stack, so
 * a corrupt list falls back to no focus and is overwritten by the next write
 * without touching other stacks' lists (the corrupt-lock `useStackLimits`
 * needs for its shared record has nothing to protect here).
 */
export const useFlashcardPool = (
  stackKey: StackKey
): UseFlashcardPoolResult => {
  const { limits } = useStackLimits(stackKey);
  const [focusPositions, setStoredPositions] = useLocalDb<
    readonly DeckPosition[]
  >(`${FOCUS_POSITIONS_LSK}-${stackKey}`, NO_FOCUS, isFocusPositionList, {
    onCorrupt: reportLocalDbCorruption,
    onWriteFailed: handleLocalDbWriteFailed,
  });

  const pool = useMemo<FlashcardPool>(
    () =>
      focusPositions.length > 0
        ? { kind: "focus", positions: focusPositions }
        : { kind: "range", limits },
    [focusPositions, limits]
  );

  const sessionScope: SessionScope =
    pool.kind === "focus"
      ? { focusPositions: pool.positions }
      : { stackLimits: pool.limits };

  const setFocusPositions = useCallback(
    (positions: readonly DeckPosition[]) => {
      setStoredPositions(positions, {
        onSuccess: () => {
          analytics.trackEvent(
            "Settings",
            positions.length > 0
              ? "Focus Positions Set"
              : "Focus Positions Cleared",
            `${stacks[stackKey].name} (${positions.length})`
          );
        },
      });
    },
    [setStoredPositions, stackKey]
  );

  return {
    focusPositions,
    pool,
    poolSize: getPoolSize(pool),
    sessionScope,
    setFocusPositions,
  };
};
