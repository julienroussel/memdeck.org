import { useCallback } from "react";
import { WHATS_NEW_LAST_SEEN_LSK } from "../constants";
import { WHATS_NEW_ENTRIES } from "../data/whats-new";
import { useLocalDb } from "../utils/localstorage";
import {
  handleLocalDbWriteFailed,
  reportLocalDbCorruption,
} from "../utils/localstorage-telemetry";

// Mirrors `isBoolean` in share-nudge.tsx — module-scoped, not exported.
const isStringOrNull = (value: unknown): value is string | null =>
  typeof value === "string" || value === null;

/**
 * Tracks whether the user has seen the newest What's New entry, keyed on the
 * entry **id** (not its date) so the nav badge re-arms only when a genuinely
 * new entry is published. `markLatestSeen` persists the newest id; because
 * `useLocalDb` dispatches a same-tab change event on write, the persistent
 * navbar's separate hook instance clears its badge live (no reload).
 */
export const useUnseenWhatsNew = (): {
  hasUnseen: boolean;
  markLatestSeen: () => void;
} => {
  const [lastSeen, setLastSeen] = useLocalDb<string | null>(
    WHATS_NEW_LAST_SEEN_LSK,
    null,
    isStringOrNull,
    {
      onCorrupt: reportLocalDbCorruption,
      onWriteFailed: handleLocalDbWriteFailed,
    }
  );

  const latestId = WHATS_NEW_ENTRIES[0]?.id ?? null;
  const hasUnseen = latestId !== null && latestId !== lastSeen;

  const markLatestSeen = useCallback(() => {
    if (hasUnseen) {
      setLastSeen(latestId);
    }
  }, [hasUnseen, setLastSeen, latestId]);

  return { hasUnseen, markLatestSeen };
};
