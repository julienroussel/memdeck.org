import { LAST_SAVE_FAILED_LSK, LAST_SAVE_FAILED_SHOWN_SSK } from "../constants";
import { analytics } from "../services/analytics";
import { probeStoredValue } from "./localstorage";

/**
 * "Last session save failed" breadcrumb. Set by the auto-save path on
 * unmount/beforeunload — when the page is closing so no notification can be
 * shown. Read on the next session start so the user is told their previous
 * session wasn't saved. Cleared as soon as it's surfaced.
 *
 * The shape carries the failure reason so triage can distinguish a quota
 * write-failure from a corruption refusal.
 */
type LastSaveFailedBreadcrumb = {
  reason:
    | "write-failed"
    | "serialize-failed"
    | "corrupt"
    | "corrupt-prior-state";
  failedAt: string;
};

const isReason = (
  value: unknown
): value is LastSaveFailedBreadcrumb["reason"] =>
  value === "write-failed" ||
  value === "serialize-failed" ||
  value === "corrupt" ||
  value === "corrupt-prior-state";

const isLastSaveFailedBreadcrumb = (
  value: unknown
): value is LastSaveFailedBreadcrumb =>
  typeof value === "object" &&
  value !== null &&
  "reason" in value &&
  "failedAt" in value &&
  isReason(value.reason) &&
  typeof value.failedAt === "string";

export const writeLastSaveFailedBreadcrumb = (
  reason: LastSaveFailedBreadcrumb["reason"]
): void => {
  try {
    const breadcrumb: LastSaveFailedBreadcrumb = {
      reason,
      failedAt: new Date().toISOString(),
    };
    localStorage.setItem(LAST_SAVE_FAILED_LSK, JSON.stringify(breadcrumb));
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("[breadcrumbs] Failed to write last-save-failed:", error);
    }
    // Surface to telemetry so we can quantify breadcrumb-write failures.
    // Wrap in try/catch — analytics in an already-failing path must not cascade.
    try {
      analytics.trackError(
        error instanceof Error ? error : new Error("Breadcrumb write failed"),
        "writeLastSaveFailedBreadcrumb"
      );
    } catch {
      // intentionally empty
    }
    // Original write already failed and now the breadcrumb can't be persisted —
    // user just won't see the delayed notification.
  }
};

export const readLastSaveFailedBreadcrumb =
  (): LastSaveFailedBreadcrumb | null => {
    const probe = probeStoredValue(
      LAST_SAVE_FAILED_LSK,
      isLastSaveFailedBreadcrumb
    );
    // Default unknown future statuses to null so this stays forward-compatible
    // as new probe statuses are added.
    switch (probe.status) {
      case "valid":
        return probe.value;
      case "corrupt":
      case "read-error":
        // Surface to telemetry so a corrupt/unreadable breadcrumb does not
        // silently disappear — without this signal the user just stops getting
        // their delayed save-failed notification with no diagnostic trail.
        try {
          analytics.trackError(
            new Error(`breadcrumb-read-failed: ${probe.status}`),
            "readLastSaveFailedBreadcrumb"
          );
        } catch {
          // Analytics MUST NOT break the read path.
        }
        return null;
      default:
        return null;
    }
  };

export const clearLastSaveFailedBreadcrumb = (): void => {
  try {
    localStorage.removeItem(LAST_SAVE_FAILED_LSK);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("[breadcrumbs] Failed to clear last-save-failed:", error);
    }
    // Surface to telemetry — silent removeItem failure pins the
    // save-failed notification forever on the user's next session.
    try {
      analytics.trackError(
        error instanceof Error
          ? error
          : new Error(`breadcrumb-clear-failed: ${String(error)}`),
        "clearLastSaveFailedBreadcrumb"
      );
    } catch {
      // Analytics MUST NOT break the clear path.
    }
    // Defensive fallback — if removeItem failed (e.g. transient ITP block on
    // remove only), overwrite with a null sentinel so subsequent reads return
    // null and the notification doesn't pin. Wrapped in its own try/catch
    // because setItem can also fail (quota, security).
    try {
      localStorage.setItem(LAST_SAVE_FAILED_LSK, JSON.stringify(null));
    } catch (sentinelError) {
      // Both removeItem and setItem failed — the breadcrumb is now pinned
      // across sessions and the user will see the delayed notification on
      // every mount until storage clears. Surface to telemetry so the
      // stuck-breadcrumb scenario is observable; analytics MUST NOT cascade.
      if (import.meta.env.DEV) {
        console.warn(
          "clearLastSaveFailedBreadcrumb: sentinel write failed",
          sentinelError
        );
      }
      try {
        analytics.trackError(
          sentinelError instanceof Error
            ? sentinelError
            : new Error(
                `breadcrumb-clear-sentinel-failed: ${String(sentinelError)}`
              ),
          "clearLastSaveFailedBreadcrumb:sentinel"
        );
      } catch {
        // intentionally empty
      }
    }
  }
};

/**
 * sessionStorage backstop for the rare case where
 * `clearLastSaveFailedBreadcrumb` cannot persist (both `removeItem` and the
 * null-sentinel `setItem` fail). Without this, every fresh mount re-fires
 * the "last save failed" notification (issue #629). sessionStorage is in a
 * separate quota bucket from localStorage, so it tends to remain writable
 * when localStorage is exhausted.
 *
 * Read failure defaults to `false` so a transient sessionStorage error
 * surfaces the notification — a milder cost than silently swallowing the
 * legitimate first-mount surface.
 */
export const hasLastSaveFailedNotificationBeenShown = (
  failedAt: string
): boolean => {
  try {
    return sessionStorage.getItem(LAST_SAVE_FAILED_SHOWN_SSK) === failedAt;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn(
        "[breadcrumbs] Failed to read last-save-failed-shown sentinel:",
        error
      );
    }
    try {
      analytics.trackError(
        error instanceof Error
          ? error
          : new Error(`sentinel-read-failed: ${String(error)}`),
        "hasLastSaveFailedNotificationBeenShown"
      );
    } catch {
      // intentionally empty
    }
    return false;
  }
};

export const markLastSaveFailedNotificationShown = (failedAt: string): void => {
  try {
    sessionStorage.setItem(LAST_SAVE_FAILED_SHOWN_SSK, failedAt);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn(
        "[breadcrumbs] Failed to write last-save-failed-shown sentinel:",
        error
      );
    }
    try {
      analytics.trackError(
        error instanceof Error
          ? error
          : new Error(`sentinel-write-failed: ${String(error)}`),
        "markLastSaveFailedNotificationShown"
      );
    } catch {
      // intentionally empty
    }
  }
};
