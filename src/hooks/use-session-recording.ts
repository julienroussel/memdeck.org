import { type Dispatch, type SetStateAction, useCallback } from "react";
import type { SessionPhase } from "../types/session";

type UseSessionRecordingOptions = {
  setStatus: Dispatch<SetStateAction<SessionPhase>>;
};

type UseSessionRecordingResult = {
  recordCorrect: () => void;
  recordIncorrect: () => void;
  recordQuestionAdvanced: () => void;
};

export const useSessionRecording = ({
  setStatus,
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
          bestStreak: Math.max(prev.session.bestStreak, newStreak),
          currentStreak: newStreak,
          successes: prev.session.successes + 1,
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
          currentStreak: 0,
          fails: prev.session.fails + 1,
        },
      };
    });
  }, [setStatus]);

  const recordQuestionAdvanced = useCallback(() => {
    setStatus((prev) => {
      if (prev.phase !== "active") {
        return prev;
      }
      return {
        phase: "active",
        session: {
          ...prev.session,
          questionsCompleted: prev.session.questionsCompleted + 1,
        },
      };
    });
  }, [setStatus]);

  return { recordCorrect, recordIncorrect, recordQuestionAdvanced };
};
