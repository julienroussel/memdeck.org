import { readLocalStorageValue, useLocalStorage } from "@mantine/hooks";
import { useCallback, useEffect, useRef } from "react";

/**
 * Result of probing a localStorage key: distinguishes "key absent" from "key
 * present but invalid" so callers (e.g. `finalizeSession`) can refuse to
 * overwrite corrupt data instead of silently treating it as empty.
 */
type StoredValueProbe<T> =
  | { status: "absent" }
  | { status: "valid"; value: T }
  | { status: "corrupt"; raw: unknown }
  | { status: "read-error"; error: unknown };

/**
 * Reads and validates a value from localStorage, returning a discriminated
 * result that lets callers tell apart absent / valid / corrupt states.
 *
 * Use this when overwriting the key would destroy state the user might still
 * be able to recover (e.g. session history). Use `getStoredValue` when you
 * just need a value-or-default and the key has no recovery semantics.
 */
export const probeStoredValue = <T>(
  key: string,
  validate: (value: unknown) => value is T
): StoredValueProbe<T> => {
  try {
    const raw: unknown = readLocalStorageValue({ key });

    if (raw === undefined || raw === null) {
      return { status: "absent" };
    }

    if (!validate(raw)) {
      if (import.meta.env.DEV) {
        console.warn(`[localStorage] Validation failed for key "${key}":`, raw);
      }
      return { status: "corrupt", raw };
    }

    return { status: "valid", value: raw };
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn(`[localStorage] Failed to read key "${key}":`, error);
    }
    // Surface read errors as a distinct state so consumers with recovery
    // semantics (e.g. session history) can refuse to overwrite — a transient
    // read failure is indistinguishable from intact-data-we-can't-read, and
    // overwriting on the next write would silently destroy potentially
    // recoverable data. Consumers without recovery semantics can collapse
    // this to a default explicitly.
    return { status: "read-error", error };
  }
};

/**
 * Reads and validates a value from localStorage.
 * Returns the stored value if valid, or the default value otherwise.
 *
 * The `validate` type guard checks the raw value before returning it.
 * If validation fails, `defaultValue` is returned.
 *
 * Use `probeStoredValue` instead when you need to distinguish absent from
 * corrupt — e.g. when overwriting would destroy recoverable state.
 *
 * Note: Intentionally logs warnings in DEV mode when stored data
 * fails validation or cannot be read, to aid debugging localStorage issues.
 */
export const getStoredValue = <T>(
  key: string,
  defaultValue: T,
  validate: (value: unknown) => value is T
): T => {
  const probe = probeStoredValue(key, validate);
  return probe.status === "valid" ? probe.value : defaultValue;
};

export type UseLocalDbSetOptions = { onSuccess?: () => void };

export type UseLocalDbSetter<T> = (
  value: T | ((prevState: T) => T),
  options?: UseLocalDbSetOptions
) => void;

/**
 * A wrapper around Mantine's useLocalStorage with error handling.
 * Supports any JSON-serializable type (string, number, boolean, object, array).
 *
 * Pass `onCorrupt` to be notified when the stored value exists but cannot be
 * validated (or the read itself fails). Without it, the hook silently falls
 * back to `defaultValue` and any corrupt state is overwritten on the next
 * write — destroying potentially recoverable data with no signal to the
 * caller. Callers that own recoverable state should provide a callback so
 * they can surface a breadcrumb / telemetry event before the overwrite.
 *
 * Pass `onWriteFailed` to be notified when a write to localStorage throws
 * (quota exceeded, Safari private mode, ITP eviction). Mantine's setter
 * silently swallows these errors; the wrapper re-runs the write inside the
 * Mantine state-updater closure to detect the failure synchronously with
 * the resolved value.
 *
 * The returned setter accepts an optional `{ onSuccess }` so callers can
 * gate side effects (analytics emits, navigation) on a real persisted
 * write rather than the silent-success path Mantine presents after a
 * quota failure.
 */
export const useLocalDb = <T>(
  key: string,
  defaultValue: T,
  validate: (value: unknown) => value is T,
  onCorrupt?: (key: string, error: unknown) => void,
  onWriteFailed?: (key: string, error: unknown) => void
): [T, UseLocalDbSetter<T>, () => void] => {
  // Cache the initial probe in a ref so it isn't re-executed every render.
  // Recomputed via useEffect when `key` changes.
  const probeRef = useRef<StoredValueProbe<T> | null>(null);
  if (probeRef.current === null) {
    probeRef.current = probeStoredValue(key, validate);
  }

  // Dedup sentinel: tracks the storage key for which we've already invoked
  // `onCorrupt`. Without this, a 1Hz-timer page (e.g. Distance/Flashcard) on
  // a corrupt key would fire telemetry on every render. The deserialize
  // callback shares this ref so a transient corrupt event doesn't double-fire
  // from probe + deserialize for the same key.
  const reportedKeyRef = useRef<string | null>(null);

  // Mirror dedup for write failures: at most one `onWriteFailed` per failure
  // streak per key. Without it, a page that retries a setter (e.g. user
  // mashing a toggle on a quota-exceeded device) would fire a telemetry storm
  // and stack identical toasts. Streaks reset on a successful write so a
  // recovery-then-new-failure case still surfaces (write A fails → user
  // clears space → write B succeeds → ref clears → write C fails fires again).
  const reportedWriteKeyRef = useRef<string | null>(null);

  // Capture latest onCorrupt in a ref so the deserialize closure (created
  // once for the lifetime of useLocalStorage) can see the current callback
  // without having to re-create the hook config.
  const onCorruptRef = useRef(onCorrupt);
  useEffect(() => {
    onCorruptRef.current = onCorrupt;
  }, [onCorrupt]);

  // Same trick for onWriteFailed: keeps the wrapped setter's identity stable
  // (consumers memoize on it) regardless of whether the caller passes an
  // inline arrow.
  const onWriteFailedRef = useRef(onWriteFailed);
  useEffect(() => {
    onWriteFailedRef.current = onWriteFailed;
  }, [onWriteFailed]);

  const probe = probeRef.current;
  const storedDefault = probe.status === "valid" ? probe.value : defaultValue;

  // Recompute the probe and reset the dedup sentinels when `key` changes.
  // We intentionally exclude `validate` from deps: it's typically a stable
  // module-level type guard, and including it would re-probe on every render
  // for callers that pass an inline guard.
  // biome-ignore lint/correctness/useExhaustiveDependencies: validate is expected to be a stable type guard; depending on it would re-probe on every render for inline guards
  useEffect(() => {
    probeRef.current = probeStoredValue(key, validate);
    reportedKeyRef.current = null;
    reportedWriteKeyRef.current = null;
  }, [key]);

  // Fire onCorrupt at most once per mount per corrupt key, after render —
  // never during render, which is what caused the per-render telemetry storm.
  useEffect(() => {
    const current = probeRef.current;
    if (current === null) {
      return;
    }
    if (reportedKeyRef.current === key) {
      return;
    }
    const cb = onCorruptRef.current;
    if (!cb) {
      return;
    }
    if (current.status === "corrupt") {
      reportedKeyRef.current = key;
      cb(key, current.raw);
    } else if (current.status === "read-error") {
      reportedKeyRef.current = key;
      cb(key, current.error);
    }
  }, [key]);

  const [value, setValue, removeValue] = useLocalStorage({
    key,
    defaultValue: storedDefault,
    deserialize: (raw: string | undefined) => {
      if (raw === undefined || raw === null) {
        return storedDefault;
      }
      try {
        const parsed: unknown = JSON.parse(raw);
        if (validate(parsed)) {
          return parsed;
        }
        // Validation failure on cross-tab/storage-event read: surface to
        // telemetry (deduped via reportedKeyRef so we don't double-fire
        // alongside the mount-time probe report).
        if (reportedKeyRef.current !== key) {
          reportedKeyRef.current = key;
          onCorruptRef.current?.(key, raw);
        }
        if (import.meta.env.DEV) {
          console.warn(
            `[localStorage] Validation failed for key "${key}":`,
            parsed
          );
        }
        return storedDefault;
      } catch (error) {
        if (reportedKeyRef.current !== key) {
          reportedKeyRef.current = key;
          onCorruptRef.current?.(key, error);
        }
        if (import.meta.env.DEV) {
          console.warn(
            `[localStorage] Deserialize failed for key "${key}":`,
            error
          );
        }
        return storedDefault;
      }
    },
  });

  // The probe write **must** run inside Mantine's state updater so it shares
  // lexical scope with `resolved`. React's eager-state optimisation only fires
  // when the fiber has no pending lanes; any queued update on the same fiber
  // (a prior setState in the same handler, an effect-driven update mid-render)
  // defers the updater to commit. If the probe sat outside the closure,
  // `resolved` would be `undefined` on the deferred path and
  // `JSON.stringify(undefined)` would coerce to `"undefined"`, silently
  // corrupting the persisted value.
  //
  // The user-visible callbacks (`onSuccess`, `onWriteFailed`), however, run
  // AFTER `setValue` returns — outside the updater closure — so React's purity
  // contract for state-updater functions stays intact. We capture the probe
  // outcome in a closure variable, then dispatch callbacks once the updater
  // has resolved. The `outcome === null` guard makes the setItem idempotent
  // across StrictMode double-invokes and concurrent rebases (only the first
  // run records the outcome).
  //
  // TODO: Mantine's own setItem still runs after our probe, so each call costs
  // two `localStorage.setItem` writes plus two `storage` events. Eliminating
  // the duplicate would mean replacing Mantine's `useLocalStorage` with a
  // local `useState`/`setItem` wrapper — out of scope for the silent-write fix.
  const handleWriteSuccess = useCallback(
    (onSuccess: (() => void) | undefined): void => {
      reportedWriteKeyRef.current = null;
      try {
        onSuccess?.();
      } catch (callbackError) {
        if (import.meta.env.DEV) {
          console.warn(
            `[localStorage] onSuccess threw for key "${key}":`,
            callbackError
          );
        }
      }
    },
    [key]
  );

  const handleWriteFailure = useCallback(
    (error: unknown): void => {
      if (reportedWriteKeyRef.current !== key) {
        reportedWriteKeyRef.current = key;
        try {
          onWriteFailedRef.current?.(key, error);
        } catch (callbackError) {
          if (import.meta.env.DEV) {
            console.warn(
              `[localStorage] onWriteFailed threw for key "${key}":`,
              callbackError
            );
          }
        }
      }
      if (import.meta.env.DEV) {
        console.warn(`[localStorage] Write failed for key "${key}":`, error);
      }
    },
    [key]
  );

  const probedSetValue = useCallback(
    (next: T | ((prev: T) => T), options?: UseLocalDbSetOptions): void => {
      // Hold the outcome on an object so TypeScript doesn't narrow the
      // closure variable to `null` by control-flow analysis (mutations
      // through the setValue updater closure aren't tracked).
      const outcomeBox: {
        value: { ok: true } | { ok: false; error: unknown } | null;
      } = { value: null };
      setValue((prev) => {
        const resolved =
          typeof next === "function"
            ? // `as` justified: typeof check cannot narrow T | ((prev: T) => T)
              // to the function branch when T is unconstrained — TypeScript
              // can't prove T isn't itself a function type. The hook's
              // JSON-serializable contract makes the updater branch the only
              // inhabitant in practice.
              (next as (prev: T) => T)(prev)
            : next;
        if (outcomeBox.value === null) {
          try {
            localStorage.setItem(key, JSON.stringify(resolved));
            outcomeBox.value = { ok: true };
          } catch (error) {
            outcomeBox.value = { ok: false, error };
          }
        }
        return resolved;
      });

      // If the updater was deferred (concurrent transition) `outcome` may be
      // null here. All current call sites invoke this from event handlers,
      // where React 18 flushes synchronously by the end of the handler, so
      // this branch is defensive — skip user callbacks rather than firing
      // them with stale info.
      const outcome = outcomeBox.value;
      if (outcome === null) {
        return;
      }
      if (outcome.ok) {
        handleWriteSuccess(options?.onSuccess);
        return;
      }
      handleWriteFailure(outcome.error);
    },
    [setValue, key, handleWriteSuccess, handleWriteFailure]
  );

  return [value, probedSetValue, removeValue];
};
