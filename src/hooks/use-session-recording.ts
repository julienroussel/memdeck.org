import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useCallback,
} from "react";
import type { ActiveSession, SessionPhase } from "../types/session";

type UseSessionRecordingOptions = {
  setStatus: Dispatch<SetStateAction<SessionPhase>>;
  pendingFinalizationRef: RefObject<ActiveSession | null>;
};

type UseSessionRecordingResult = {
  recordCorrect: () => void;
  recordIncorrect: () => void;
  recordQuestionAdvanced: () => void;
};

export const useSessionRecording = ({
  setStatus,
  pendingFinalizationRef,
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

  const recordQuestionAdvanced = useCallback(() => {
    setStatus((prev) => {
      if (prev.phase !== "active") {
        return prev;
      }
      const newCompleted = prev.session.questionsCompleted + 1;
      const { config } = prev.session;

      // Auto-complete structured session when done — schedule finalization
      // via the ref so side effects run outside this pure updater.
      if (
        config.type === "structured" &&
        newCompleted >= config.totalQuestions
      ) {
        const updatedSession = {
          ...prev.session,
          questionsCompleted: newCompleted,
        };
        pendingFinalizationRef.current = updatedSession;
        return { phase: "active", session: updatedSession };
      }

      return {
        phase: "active",
        session: { ...prev.session, questionsCompleted: newCompleted },
      };
    });
  }, [setStatus, pendingFinalizationRef]);

  return { recordCorrect, recordIncorrect, recordQuestionAdvanced };
};
