import { type Dispatch, type SetStateAction, useCallback } from "react";
import type { ActiveSession, SessionPhase } from "../types/session";
import { useSetStateWithSideEffect } from "./use-set-state-with-side-effect";

type UseSessionRecordingOptions = {
  setStatus: Dispatch<SetStateAction<SessionPhase>>;
  requestFinalization: (session: ActiveSession) => void;
};

/**
 * Pure derivation of the next phase plus an optional session-to-finalize from
 * the previous phase. Extracted so the `setStatus` updater is a pure function
 * — no outer-variable assignment, safe under React StrictMode double-invoke.
 */
const advanceQuestion = (
  prev: SessionPhase
): { next: SessionPhase; payload: ActiveSession | null } => {
  if (prev.phase !== "active") {
    return { next: prev, payload: null };
  }
  const newCompleted = prev.session.questionsCompleted + 1;
  const updatedSession: ActiveSession = {
    ...prev.session,
    questionsCompleted: newCompleted,
  };
  const isStructuredComplete =
    prev.session.config.type === "structured" &&
    newCompleted >= prev.session.config.totalQuestions;
  return {
    next: { phase: "active", session: updatedSession },
    payload: isStructuredComplete ? updatedSession : null,
  };
};

type UseSessionRecordingResult = {
  recordCorrect: () => void;
  recordIncorrect: () => void;
  recordQuestionAdvanced: () => void;
};

export const useSessionRecording = ({
  setStatus,
  requestFinalization,
}: UseSessionRecordingOptions): UseSessionRecordingResult => {
  const recordCorrect = useCallback(() => {
    setStatus((prev) => {
      if (prev.phase !== "active") {
        return prev;
      }
      const newStreak = prev.session.currentStreak + 1;
      return {
        phase: "active",
        session: {
          ...prev.session,
          successes: prev.session.successes + 1,
          currentStreak: newStreak,
          bestStreak: Math.max(prev.session.bestStreak, newStreak),
        },
      };
    });
  }, [setStatus]);

  const recordIncorrect = useCallback(() => {
    setStatus((prev) => {
      if (prev.phase !== "active") {
        return prev;
      }
      return {
        phase: "active",
        session: {
          ...prev.session,
          fails: prev.session.fails + 1,
          currentStreak: 0,
        },
      };
    });
  }, [setStatus]);

  // Compute the next phase and an optional session-to-finalize from the
  // latest queued state, then dispatch finalization AFTER setStatus returns.
  // The shared hook owns the updater→ref→post-setState plumbing; this hook
  // just supplies the pure compute function.
  const dispatchAdvance = useSetStateWithSideEffect(
    setStatus,
    requestFinalization
  );

  const recordQuestionAdvanced = useCallback(() => {
    dispatchAdvance(advanceQuestion);
  }, [dispatchAdvance]);

  return { recordCorrect, recordIncorrect, recordQuestionAdvanced };
};
