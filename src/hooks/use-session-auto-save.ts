import { notifications } from "@mantine/notifications";
import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
import { useTranslation } from "react-i18next";
import type { ActiveSession, SessionPhase } from "../types/session";
import type { StackKey } from "../types/stacks";
import { reportSessionPersistenceFailed } from "../utils/localstorage-telemetry";
import { writeLastSaveFailedBreadcrumb } from "../utils/session-breadcrumbs";
import type { FinalizeFailureReason } from "../utils/session-persistence";
import { meetsMinimumSaveThreshold } from "../utils/session-phase";
import type {
  TryFinalizeSessionResult,
  TrySaveCheckpointResult,
} from "./use-session";

type UseSessionAutoSaveOptions = {
  stackKey: StackKey;
  statusRef: RefObject<SessionPhase>;
  setStatus: Dispatch<SetStateAction<SessionPhase>>;
  tryFinalizeSession: (session: ActiveSession) => TryFinalizeSessionResult;
  requestFinalization: (session: ActiveSession) => void;
  trySaveCheckpoint: (session: ActiveSession) => TrySaveCheckpointResult;
};

// A save on page exit or hide cannot rely on a notification being seen (the
// page is closing or in the background), so a failure writes the breadcrumb
// for the NEXT session start to surface.
const reportPageExitSaveFailure = (
  reason: FinalizeFailureReason,
  context: string,
  sessionId: string
) => {
  writeLastSaveFailedBreadcrumb(reason, sessionId);
  // The context distinguishes this from the :cleanup and useSession:flush
  // call sites in GA, see reportSessionPersistenceFailed.
  reportSessionPersistenceFailed(reason, context);
  if (import.meta.env.DEV) {
    console.warn(
      `useSessionAutoSave: failed to save session on page exit or hide (${reason})`
    );
  }
};

export const useSessionAutoSave = ({
  stackKey,
  statusRef,
  setStatus,
  tryFinalizeSession,
  requestFinalization,
  trySaveCheckpoint,
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
  // want. Synced in a layout effect, not during render, so a discarded render
  // cannot leave an uncommitted `t` behind for the cleanup.
  const tRef = useRef(t);
  useLayoutEffect(() => {
    tRef.current = t;
  }, [t]);

  // Auto-save on stack change. We have time for a re-render, so route through
  // requestFinalization — the flush effect surfaces save failures as a
  // notification (and leaves phase active for retry). See F2.
  const prevStackKeyRef = useRef(stackKey);
  useEffect(() => {
    if (prevStackKeyRef.current !== stackKey) {
      prevStackKeyRef.current = stackKey;
      const { current } = statusRef;
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
  //
  // Page hidden (`visibilitychange` to hidden, `pagehide`): mobile browsers and
  // installed PWAs often kill a backgrounded page without `beforeunload`, so
  // hiding is the last reliable moment to save. The page may also come back,
  // so a mere hide saves a checkpoint (trySaveCheckpoint) of the open or
  // structured session under its own id and leaves it running in memory. A
  // later checkpoint or the final save replaces that history record and adds
  // only the difference to all-time stats, so the session stays one record. A
  // `pagehide` not entering bfcache means the page is really leaving, so it
  // finalizes. When several of these events fire for one exit,
  // tryFinalizeSession dedupes on the session id, so only the first one saves.
  useEffect(() => {
    const handleBeforeUnloadEvent = () => {
      const { current } = statusRef;
      if (
        current.phase !== "active" ||
        !meetsMinimumSaveThreshold(current.session)
      ) {
        return;
      }
      const result = tryFinalizeSession(current.session);
      if (result.status === "write-failed") {
        reportPageExitSaveFailure(
          result.reason,
          "useSessionAutoSave:beforeUnload",
          current.session.id
        );
      }
    };

    const handlePageHidden = (leaving: boolean) => {
      const { current } = statusRef;
      if (
        current.phase !== "active" ||
        !meetsMinimumSaveThreshold(current.session)
      ) {
        return;
      }
      const result = leaving
        ? tryFinalizeSession(current.session)
        : trySaveCheckpoint(current.session);
      if (result.status === "write-failed") {
        reportPageExitSaveFailure(
          result.reason,
          "useSessionAutoSave:pageHidden",
          current.session.id
        );
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        handlePageHidden(false);
      }
    };

    const handlePageHide = (event: PageTransitionEvent) => {
      handlePageHidden(!event.persisted);
    };

    window.addEventListener("beforeunload", handleBeforeUnloadEvent);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnloadEvent);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
      const { current } = statusRef;
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
          message: tNow(
            isUnrecoverable
              ? "errors.sessionStorageCorrupt.message"
              : "errors.sessionSaveFailed.message"
          ),
          title: tNow(
            isUnrecoverable
              ? "errors.sessionStorageCorrupt.title"
              : "errors.sessionSaveFailed.title"
          ),
        });
      }
    };
  }, [tryFinalizeSession, trySaveCheckpoint, statusRef]);
};
