import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useEffect,
  useRef,
} from "react";
import type {
  ActiveSession,
  SessionPhase,
  SessionSummary,
} from "../types/session";
import type { StackKey } from "../types/stacks";
import { meetsMinimumSaveThreshold } from "../utils/session-phase";

type UseSessionAutoSaveOptions = {
  stackKey: StackKey;
  statusRef: RefObject<SessionPhase>;
  setStatus: Dispatch<SetStateAction<SessionPhase>>;
  tryFinalizeSession: (session: ActiveSession) => SessionSummary | null;
};

export const useSessionAutoSave = ({
  stackKey,
  statusRef,
  setStatus,
  tryFinalizeSession,
}: UseSessionAutoSaveOptions): void => {
  // Auto-save on stack change
  const prevStackKeyRef = useRef(stackKey);
  useEffect(() => {
    if (prevStackKeyRef.current !== stackKey) {
      prevStackKeyRef.current = stackKey;
      if (
        statusRef.current.phase === "active" &&
        meetsMinimumSaveThreshold(statusRef.current.session)
      ) {
        const summary = tryFinalizeSession(statusRef.current.session);
        if (summary !== null) {
          setStatus({ phase: "summary", summary });
        }
      } else if (statusRef.current.phase === "active") {
        setStatus({ phase: "idle" });
      }
    }
  }, [stackKey, tryFinalizeSession, statusRef, setStatus]);

  // Auto-save on unmount and beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      const current = statusRef.current;
      if (
        current.phase === "active" &&
        meetsMinimumSaveThreshold(current.session)
      ) {
        tryFinalizeSession(current.session);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      handleBeforeUnload();
    };
  }, [tryFinalizeSession, statusRef]);
};
