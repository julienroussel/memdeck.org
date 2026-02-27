import type {
  ActiveSession,
  AnswerOutcome,
  SessionPhase,
} from "../types/session";

/** Extracts the active session from the session phase, or null if not active */
export const deriveActiveSession = (
  status: SessionPhase
): ActiveSession | null => (status.phase === "active" ? status.session : null);

/** Determines whether the current session is a structured (finite) session */
export const deriveIsStructuredSession = (
  activeSession: ActiveSession | null
): boolean =>
  activeSession !== null && activeSession.config.type === "structured";

/** Routes an answer outcome to the appropriate recording callbacks */
export const applyAnswerOutcome = (
  outcome: AnswerOutcome,
  callbacks: {
    recordCorrect: () => void;
    recordIncorrect: () => void;
    recordQuestionAdvanced: () => void;
  }
): void => {
  if (outcome.correct) {
    callbacks.recordCorrect();
  } else {
    callbacks.recordIncorrect();
  }
  if (outcome.questionAdvanced) {
    callbacks.recordQuestionAdvanced();
  }
};

/** Returns true if the session has enough questions to be worth persisting */
export const meetsMinimumSaveThreshold = (session: ActiveSession): boolean => {
  if (session.config.type === "structured") {
    return session.questionsCompleted > 0;
  }
  // Open sessions require at least 3 questions to avoid cluttering history
  // with micro-sessions from briefly visiting a page
  return session.questionsCompleted >= 3;
};
