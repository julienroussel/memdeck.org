import { notifications } from "@mantine/notifications";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { STACK_LIMITS_LSK } from "../constants";
import { analytics } from "../services/analytics";
import { eventBus } from "../services/event-bus";
import {
  DEFAULT_STACK_LIMITS,
  getRangeSize,
  isFullDeck,
  isStackLimitsRecord,
  type StackLimits,
  type StackLimitsRecord,
} from "../types/stack-limits";
import { createDeckPosition, type StackKey, stacks } from "../types/stacks";
import { probeStoredValue, useLocalDb } from "../utils/localstorage";
import {
  handleLocalDbWriteFailed,
  reportLocalDbCorruption,
} from "../utils/localstorage-telemetry";

type UseStackLimitsResult = {
  limits: StackLimits;
  setLimits: (limits: StackLimits) => void;
  rangeSize: number;
  isFullDeck: boolean;
};

// Approach 1 (corrupt-prior-state discipline): if the stored
// `StackLimitsRecord` blob is corrupt or unreadable at mount, refuse to
// write — `useLocalDb` would otherwise hand back the empty default `{}`
// and the next `setLimits` call would merge into `{}`, silently destroying
// every other stack's saved range. Splitting into per-stack keys would
// require a migration touching consumers outside this hook's ownership.
export const useStackLimits = (stackKey: StackKey): UseStackLimitsResult => {
  const { t } = useTranslation();
  const tRef = useRef(t);
  tRef.current = t;

  const [record, setRecord] = useLocalDb<StackLimitsRecord>(
    STACK_LIMITS_LSK,
    {},
    isStackLimitsRecord,
    reportLocalDbCorruption,
    handleLocalDbWriteFailed
  );

  // Probe once on mount; if the stored blob is corrupt, lock writes for the
  // lifetime of this hook instance so we don't overwrite recoverable data.
  const corruptRef = useRef<boolean | null>(null);
  if (corruptRef.current === null) {
    const probe = probeStoredValue(STACK_LIMITS_LSK, isStackLimitsRecord);
    const corrupt = probe.status === "corrupt" || probe.status === "read-error";
    corruptRef.current = corrupt;
    if (corrupt) {
      analytics.trackError(new Error("stackLimits-corrupt"));
    }
  }

  // Surface the corruption to the user via a Mantine notification once on
  // mount. Side-effects can't run during render, so the visual notice is
  // deferred to a mount-only effect. The latch ref also keeps it idempotent
  // under StrictMode double-invoke.
  const corruptNoticeShownRef = useRef(false);
  useEffect(() => {
    if (corruptRef.current !== true || corruptNoticeShownRef.current) {
      return;
    }
    corruptNoticeShownRef.current = true;
    notifications.show({
      color: "red",
      title: tRef.current("errors.stackLimitsCorrupt.title"),
      message: tRef.current("errors.stackLimitsCorrupt.message"),
    });
  }, []);

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
    (newLimits: StackLimits): void => {
      // Refuse to overwrite a corrupt blob — preserves any other stacks'
      // ranges that may still be recoverable manually. The user has already
      // been notified of the corruption via the mount-effect toast.
      if (corruptRef.current === true) {
        return;
      }
      setRecord(
        (prev) => ({
          ...prev,
          [stackKey]: {
            start: newLimits.start,
            end: newLimits.end,
          },
        }),
        {
          // Gate the analytics emit on a real persisted write so quota /
          // ITP failures don't inflate "limits changed" counts. The user
          // sees the failure toast via `handleLocalDbWriteFailed`; GA stays
          // consistent with what actually reached storage.
          onSuccess: () => {
            eventBus.emit.STACK_LIMITS_CHANGED({
              start: newLimits.start,
              end: newLimits.end,
              rangeSize: newLimits.end - newLimits.start + 1,
              stackName: stacks[stackKey].name,
            });
          },
        }
      );
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
