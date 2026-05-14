import { notifications } from "@mantine/notifications";
import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useEffect,
  useRef,
} from "react";
import { useTranslation } from "react-i18next";
import type { ActiveSession, SessionPhase } from "../types/session";
import type { StackKey } from "../types/stacks";
import { reportSessionPersistenceFailed } from "../utils/localstorage-telemetry";
import { writeLastSaveFailedBreadcrumb } from "../utils/session-breadcrumbs";
import { meetsMinimumSaveThreshold } from "../utils/session-phase";
import type { TryFinalizeSessionResult } from "./use-session";

type UseSessionAutoSaveOptions = {
  stackKey: StackKey;
  statusRef: RefObject<SessionPhase>;
  setStatus: Dispatch<SetStateAction<SessionPhase>>;
  tryFinalizeSession: (session: ActiveSession) => TryFinalizeSessionResult;
  requestFinalization: (session: ActiveSession) => void;
};

export const useSessionAutoSave = ({
  stackKey,
  statusRef,
  setStatus,
  tryFinalizeSession,
  requestFinalization,
}: UseSessionAutoSaveOptions): void => {
  const { t } = useTranslation();

  // Hold the latest `t` in a ref so the unmount/beforeunload effect's deps
  // don't include `t`. `useTranslation`'s `t` changes identity on language
  // change; if it were in the dep array, switching languages mid-session
  // would tear down and re-set up the effect — running the cleanup on the
  // way out, which calls tryFinalizeSession on the active session and
  // marks the id finalized, blocking any later real Stop. The ref-read is
  // safe because cleanup only runs on real unmount/beforeunload, by which
  // point Mantine notifications still work and the latest `t` is what we
  // want.
  const tRef = useRef(t);
  tRef.current = t;

  // Auto-save on stack change. We have time for a re-render, so route through
  // requestFinalization — the flush effect surfaces save failures as a
  // notification (and leaves phase active for retry). See F2.
  const prevStackKeyRef = useRef(stackKey);
  useEffect(() => {
    if (prevStackKeyRef.current !== stackKey) {
      prevStackKeyRef.current = stackKey;
      const current = statusRef.current;
      if (current.phase !== "active") {
        return;
      }
      if (meetsMinimumSaveThreshold(current.session)) {
        requestFinalization(current.session);
      } else {
        setStatus({ phase: "idle" });
      }
    }
  }, [stackKey, requestFinalization, statusRef, setStatus]);

  // Auto-save on unmount and beforeunload. Neither path can wait for a
  // re-render, so we attempt a synchronous finalize.
  //
  // Real `beforeunload` (page close, tab close, browser back beyond app):
  // we cannot show a notification (page is going away). Write the
  // breadcrumb so the NEXT session start surfaces the failure to the user.
  //
  // Internal-navigation unmount (cleanup): React unmounts but the app is
  // still alive. We can show the Mantine notification synchronously here.
  // We do NOT write the breadcrumb in this path — the next mount of
  // useSession would otherwise read the breadcrumb and show a SECOND
  // notification for the same failure.
  useEffect(() => {
    const handleBeforeUnloadEvent = () => {
      const current = statusRef.current;
      if (
        current.phase !== "active" ||
        !meetsMinimumSaveThreshold(current.session)
      ) {
        return;
      }
      const result = tryFinalizeSession(current.session);
      if (result.status === "write-failed") {
        writeLastSaveFailedBreadcrumb(result.reason);
        // The :beforeUnload context distinguishes this from the :cleanup and
        // useSession:flush call sites in GA — see reportSessionPersistenceFailed.
        reportSessionPersistenceFailed(
          result.reason,
          "useSessionAutoSave:beforeUnload"
        );
        if (import.meta.env.DEV) {
          console.warn(
            `useSessionAutoSave: failed to finalize session on unload (${result.reason})`
          );
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnloadEvent);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnloadEvent);
      const current = statusRef.current;
      if (
        current.phase !== "active" ||
        !meetsMinimumSaveThreshold(current.session)
      ) {
        return;
      }
      const result = tryFinalizeSession(current.session);
      if (result.status === "write-failed") {
        reportSessionPersistenceFailed(
          result.reason,
          "useSessionAutoSave:cleanup"
        );
        const isUnrecoverable =
          result.reason === "corrupt" ||
          result.reason === "corrupt-prior-state";
        const tNow = tRef.current;
        notifications.show({
          color: isUnrecoverable ? "red" : "yellow",
          title: tNow(
            isUnrecoverable
              ? "errors.sessionStorageCorrupt.title"
              : "errors.sessionSaveFailed.title"
          ),
          message: tNow(
            isUnrecoverable
              ? "errors.sessionStorageCorrupt.message"
              : "errors.sessionSaveFailed.message"
          ),
        });
      }
    };
  }, [tryFinalizeSession, statusRef]);
};
