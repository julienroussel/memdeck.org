import { useCallback, useEffect, useRef, useState } from "react";
import { eventBus } from "../services/event-bus";
import type {
  ActiveSession,
  AnswerOutcome,
  SessionConfig,
  SessionPhase,
  SessionSummary,
  TrainingMode,
} from "../types/session";
import type { StackKey } from "../types/stacks";
import { finalizeSession } from "../utils/session-persistence";
import {
  applyAnswerOutcome,
  deriveActiveSession,
  deriveIsStructuredSession,
  meetsMinimumSaveThreshold,
} from "../utils/session-phase";
import { useSessionAutoSave } from "./use-session-auto-save";
import { useSessionRecording } from "./use-session-recording";

export type { SessionPhase } from "../types/session";

type UseSessionOptions = {
  mode: TrainingMode;
  stackKey: StackKey;
  autoStart?: boolean;
};

type UseSessionResult = {
  status: SessionPhase;
  startSession: (config: SessionConfig) => void;
  handleAnswer: (outcome: AnswerOutcome) => void;
  startNewSession: () => void;
  isStructuredSession: boolean;
  activeSession: ActiveSession | null;
  stopSession: () => void;
  dismissSummary: () => void;
};

export const useSession = ({
  mode,
  stackKey,
  autoStart = false,
}: UseSessionOptions): UseSessionResult => {
  const [status, setStatus] = useState<SessionPhase>({ phase: "idle" });
  const statusRef = useRef(status);
  statusRef.current = status;

  const pendingFinalizationRef = useRef<ActiveSession | null>(null);
  const finalizedIdsRef = useRef<Set<string>>(new Set());

  /** Deduplicating wrapper around finalizeSession. Returns null if already finalized. */
  const tryFinalizeSession = useCallback(
    (session: ActiveSession): SessionSummary | null => {
      if (finalizedIdsRef.current.has(session.id)) {
        return null;
      }
      finalizedIdsRef.current.add(session.id);
      return finalizeSession(session);
    },
    []
  );

  // DO NOT add a dependency array — this must run after every render to flush pending
  // side effects. This is the "effect flush" pattern: setState updaters (which must be
  // pure) schedule side-effectful work by writing to pendingFinalizationRef, and this
  // effect picks it up on the next render. This avoids calling localStorage/eventBus
  // inside setState. Adding `[]` would silently break structured session completion.
  useEffect(() => {
    const session = pendingFinalizationRef.current;
    if (session === null) {
      return;
    }
    pendingFinalizationRef.current = null;
    const summary = tryFinalizeSession(session);
    if (summary !== null) {
      setStatus({ phase: "summary", summary });
    }
  });

  const startSession = useCallback(
    (config: SessionConfig) => {
      // Auto-save current active session if it meets minimum threshold
      if (statusRef.current.phase === "active") {
        const { session } = statusRef.current;
        if (meetsMinimumSaveThreshold(session)) {
          tryFinalizeSession(session);
        }
      }

      finalizedIdsRef.current.clear();

      const session: ActiveSession = {
        id: crypto.randomUUID(),
        mode,
        stackKey,
        config,
        startedAt: new Date().toISOString(),
        successes: 0,
        fails: 0,
        questionsCompleted: 0,
        currentStreak: 0,
        bestStreak: 0,
      };
      setStatus({ phase: "active", session });
      eventBus.emit.SESSION_STARTED({ mode, config });
    },
    [mode, stackKey, tryFinalizeSession]
  );

  const { recordCorrect, recordIncorrect, recordQuestionAdvanced } =
    useSessionRecording({ setStatus, pendingFinalizationRef });

  const handleAnswer = useCallback(
    (outcome: AnswerOutcome) => {
      if (statusRef.current.phase !== "active") {
        return;
      }
      applyAnswerOutcome(outcome, {
        recordCorrect,
        recordIncorrect,
        recordQuestionAdvanced,
      });
    },
    [recordCorrect, recordIncorrect, recordQuestionAdvanced]
  );

  const stopSession = useCallback(() => {
    setStatus((prev) => {
      if (prev.phase !== "active") {
        return prev;
      }
      if (!meetsMinimumSaveThreshold(prev.session)) {
        return { phase: "idle" };
      }
      // Schedule finalization via the ref so side effects run outside
      // this pure updater.
      pendingFinalizationRef.current = prev.session;
      return { phase: "active", session: prev.session };
    });
  }, []);

  const dismissSummary = useCallback(() => {
    setStatus({ phase: "idle" });
  }, []);

  const startNewSession = useCallback(() => {
    const config: SessionConfig =
      statusRef.current.phase === "summary"
        ? statusRef.current.summary.record.config
        : { type: "open" };
    dismissSummary();
    startSession(config);
  }, [dismissSummary, startSession]);

  // Auto-starting an open session means training is tracked from the moment the user
  // visits the page. Sessions with fewer than 3 questions are discarded (see
  // meetsMinimumSaveThreshold), so brief visits don't pollute history.
  const initialMountRef = useRef(true);
  useEffect(() => {
    if (autoStart && initialMountRef.current && status.phase === "idle") {
      initialMountRef.current = false;
      startSession({ type: "open" });
    }
  }, [autoStart, status.phase, startSession]);

  useSessionAutoSave({ stackKey, statusRef, setStatus, tryFinalizeSession });

  const activeSession = deriveActiveSession(status);
  const isStructuredSession = deriveIsStructuredSession(activeSession);

  return {
    status,
    startSession,
    handleAnswer,
    startNewSession,
    isStructuredSession,
    activeSession,
    stopSession,
    dismissSummary,
  };
};
