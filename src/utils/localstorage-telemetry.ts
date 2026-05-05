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
