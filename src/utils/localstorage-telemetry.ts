import { notifications } from "@mantine/notifications";
import i18next from "i18next";
import { analytics } from "../services/analytics";

/**
 * Default `onCorrupt` callback for `useLocalDb`. Wraps the underlying
 * cause as an `Error` named `LocalDbCorruption` and forwards to
 * `analytics.trackError` with the offending key as supplementary context.
 *
 * Pass this to every `useLocalDb` consumer that owns user-recoverable state
 * (settings, history, stats) so silent corruption-then-overwrite events are
 * observable in production. Without it, the hook falls back to its default
 * value and the corrupt blob is destroyed on the next write with no signal.
 */
export const reportLocalDbCorruption = (key: string, cause: unknown): void => {
  // Construct a fresh Error in every branch so the caller's Error is never
  // mutated and its message — which on V8 can include a snippet of the
  // unparsed input for `JSON.parse` SyntaxErrors — never reaches GA.
  let wrapped: Error;
  if (cause instanceof Error) {
    wrapped = new Error(`type=Error name=${cause.name}`);
  } else if (typeof cause === "string") {
    wrapped = new Error(`type=string length=${cause.length}`);
  } else {
    wrapped = new Error(`type=${typeof cause}`);
  }
  wrapped.name = "LocalDbCorruption";
  analytics.trackError(wrapped, `key=${key}`);
};

/**
 * Write-side mirror of `reportLocalDbCorruption`: forwards a quota-exceeded
 * (or otherwise thrown) `localStorage.setItem` failure to analytics with the
 * offending key as context. Same scrubbing discipline — never leaks the
 * original error message to GA.
 */
export const reportLocalDbWriteFailed = (key: string, cause: unknown): void => {
  let wrapped: Error;
  if (cause instanceof Error) {
    wrapped = new Error(`type=Error name=${cause.name}`);
  } else if (typeof cause === "string") {
    wrapped = new Error(`type=string length=${cause.length}`);
  } else {
    wrapped = new Error(`type=${typeof cause}`);
  }
  wrapped.name = "LocalDbWriteFailed";
  analytics.trackError(wrapped, `key=${key}`);
};

/**
 * Surfaces a Mantine notification when a `useLocalDb` write fails. The `id`
 * field replaces a concurrently-visible toast for the same key (Mantine v9
 * semantics) — it is NOT a fire-once-ever lock. The actual once-per-mount
 * dedup lives in `useLocalDb`'s `reportedWriteKeyRef`; the id is
 * belt-and-suspenders for racing shows from the same setter.
 */
export const notifyLocalDbWriteFailed = (key: string): void => {
  notifications.show({
    id: `local-db-write-failed-${key}`,
    color: "yellow",
    title: i18next.t("errors.localDbWriteFailed.title"),
    message: i18next.t("errors.localDbWriteFailed.message"),
  });
};

/**
 * Surfaces a Mantine notification when `useLocalDb` detects a post-mount
 * valid→corrupt transition — typically a cross-tab corrupt write. Mount-time
 * corruption is intentionally not toasted here: consumers like
 * `useStackLimits` show their own dedicated mount toast, and reset-on-write
 * recovery for low-stakes single-value consumers stays silent. The actual
 * dedup lives in `useLocalDb`'s `wasValidRef`; the id is belt-and-suspenders
 * for racing shows on the same key.
 */
export const notifyLocalDbCorruption = (key: string): void => {
  notifications.show({
    id: `local-db-corrupt-${key}`,
    color: "yellow",
    title: i18next.t("errors.localDbCorrupt.title"),
    message: i18next.t("errors.localDbCorrupt.message"),
  });
};

/**
 * Combined `onWriteFailed` callback for `useLocalDb` — the canonical handler
 * consumers should pass. Reports the failure to analytics and surfaces a
 * Mantine notification so the user knows their change won't persist.
 */
export const handleLocalDbWriteFailed = (key: string, cause: unknown): void => {
  reportLocalDbWriteFailed(key, cause);
  notifyLocalDbWriteFailed(key);
};

/**
 * Reports a `notifyLocalDbCorruption` failure (toast pipeline broken) to
 * analytics. Without this breadcrumb, a regressed Mantine provider mount or a
 * pre-i18n init throw would silently disable cross-tab corruption toasts in
 * production with no signal — the data path keeps working, but the user never
 * learns another tab wrote unreadable data.
 */
export const reportLocalDbNotifyFailed = (
  key: string,
  cause: unknown
): void => {
  let wrapped: Error;
  if (cause instanceof Error) {
    wrapped = new Error(`type=Error name=${cause.name}`);
  } else if (typeof cause === "string") {
    wrapped = new Error(`type=string length=${cause.length}`);
  } else {
    wrapped = new Error(`type=${typeof cause}`);
  }
  wrapped.name = "LocalDbNotifyFailed";
  analytics.trackError(wrapped, `key=${key}`);
};
