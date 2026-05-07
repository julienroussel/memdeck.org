import { readLocalStorageValue } from "@mantine/hooks";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";

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
 * Corruption signal that consumer hooks track in their own state and surface
 * to UI. `"corrupt"` collapses both validation failures and read errors —
 * UI consumers don't need to distinguish (the user-facing message is the
 * same), and `reportLocalDbCorruption` already preserves the distinction
 * in telemetry.
 */
export type LocalDbStatus = "ready" | "corrupt";

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

type UseLocalDbSetOptions = { onSuccess?: () => void };

type UseLocalDbSetter<T> = (
  value: T | ((prevState: T) => T),
  options?: UseLocalDbSetOptions
) => void;

// Same-tab fan-out: when one `useLocalDb` instance writes, others on the
// same key need to re-read. The native `storage` event only fires in OTHER
// tabs, so we dispatch our own custom event for in-tab subscribers.
const LOCAL_STORAGE_EVENT = "memdeck-localstorage";

type LocalStorageEventDetail = { key: string };

const isLocalStorageEvent = (
  event: Event
): event is CustomEvent<LocalStorageEventDetail> => {
  if (!(event instanceof CustomEvent)) {
    return false;
  }
  const detail: unknown = event.detail;
  if (typeof detail !== "object" || detail === null) {
    return false;
  }
  if (!("key" in detail)) {
    return false;
  }
  return typeof detail.key === "string";
};

const readRawValue = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn(`[localStorage] Read failed for key "${key}":`, error);
    }
    // Mirrors Mantine's silent-fallback for storage-blocked environments
    // (Safari ITP, private mode). Read errors collapse to "absent" — the
    // wrapper has no recoverable signal to surface from this path. Callers
    // that need to distinguish "key absent" from "read errored" (e.g.
    // `useStackLimits`) call `probeStoredValue` directly, which preserves
    // the read-error status because it captures the throw at its own
    // try/catch boundary rather than collapsing it to null here.
    return null;
  }
};

// Defense-in-depth against prototype pollution: a tampered blob containing
// `__proto__`, `constructor`, or `prototype` keys would otherwise survive
// `JSON.parse` as own properties and re-attach to a real prototype the
// moment a consumer spreads the parsed value (`{ ...parsed }`). Stripping
// at parse time gives every consumer the guarantee uniformly. The reviver
// returning `undefined` deletes the key from the parsed result.
const safeJsonReviver = (key: string, value: unknown): unknown => {
  if (key === "__proto__" || key === "constructor" || key === "prototype") {
    return;
  }
  return value;
};

const parseRawValue = <T>(
  raw: string | null,
  validate: (value: unknown) => value is T
): StoredValueProbe<T> => {
  if (raw === null) {
    return { status: "absent" };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw, safeJsonReviver);
  } catch {
    // Malformed JSON: classify as corrupt with the raw bytes preserved for
    // telemetry. Mirrors `probeStoredValue` semantics (where Mantine's
    // `deserializeJSON` catches the parse error and the validator then fails
    // on the still-string value).
    return { status: "corrupt", raw };
  }
  try {
    if (validate(parsed)) {
      return { status: "valid", value: parsed };
    }
    return { status: "corrupt", raw: parsed };
  } catch (error) {
    return { status: "read-error", error };
  }
};

const subscribeToKey = (key: string, onChange: () => void): (() => void) => {
  const onStorage = (event: StorageEvent): void => {
    // `event.key === null` is fired by `localStorage.clear()` in cross-tab
    // scenarios — re-read the snapshot regardless because our key may have
    // been wiped.
    if (event.key === null || event.key === key) {
      onChange();
    }
  };
  const onCustom = (event: Event): void => {
    if (isLocalStorageEvent(event) && event.detail.key === key) {
      onChange();
    }
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(LOCAL_STORAGE_EVENT, onCustom);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(LOCAL_STORAGE_EVENT, onCustom);
  };
};

const dispatchKeyChange = (key: string): void => {
  window.dispatchEvent(
    new CustomEvent<LocalStorageEventDetail>(LOCAL_STORAGE_EVENT, {
      detail: { key },
    })
  );
};

// `useSyncExternalStore` requires a server snapshot for SSR safety. memdeck
// is an SPA, but the prerender pass runs in a real browser context with a
// usable `window` — so this null is only consulted in non-browser
// environments (test-only edge cases) and the mount snapshot will read the
// real value once `window` is present.
const getServerSnapshot = (): null => null;

/**
 * A reactive wrapper around `localStorage` for JSON-serializable values.
 *
 * **Critical invariant:** never overwrites the on-disk blob as a side-effect
 * of mounting. Mantine's `useLocalStorage` previously wrote the
 * deserialize-fallback (e.g. `{}`) back to disk on mount, which silently
 * destroyed corrupt-but-recoverable state before any consumer-level
 * corrupt-lock could fire (issue #639). This implementation reads via
 * `useSyncExternalStore` and writes only when the consumer-supplied setter
 * is called.
 *
 * **Reset-on-write recovery is the wrapper's only corruption discipline.**
 * The setter does not refuse writes when the on-disk blob is corrupt —
 * single-value consumers (`useSelectedStack`, timer settings, etc.) rely
 * on the next user interaction overwriting corrupt bytes. Multi-record
 * consumers that cannot tolerate that (`useStackLimits`) gate the setter
 * at the consumer level (see `use-stack-limits.ts:50-58, 95`).
 *
 * Pass `onCorrupt` to be notified when the stored value exists but cannot
 * be validated (the type guard returned `false`, or the type guard itself
 * threw). Storage-layer read errors (Safari ITP, private mode) collapse
 * to "absent" — `onCorrupt` is NOT fired for those. Consumers that need
 * to distinguish "absent" from "read errored" call `probeStoredValue`
 * directly. Without `onCorrupt`, the hook silently falls back to
 * `defaultValue`.
 *
 * Pass `onWriteFailed` to be notified when a write throws (quota exceeded,
 * Safari private mode, ITP eviction).
 *
 * The returned setter accepts an optional `{ onSuccess }` so callers can
 * gate side effects (analytics emits, navigation) on a real persisted
 * write rather than the silent-success path that the old Mantine setter
 * presented after a quota failure.
 *
 * Cross-tab sync: the native `storage` event fires re-renders in other
 * tabs. Same-tab sync (multiple `useLocalDb` instances on the same key)
 * goes through a project-internal `memdeck-localstorage` `CustomEvent`
 * dispatched on every write.
 */
export const useLocalDb = <T>(
  key: string,
  defaultValue: T,
  validate: (value: unknown) => value is T,
  onCorrupt?: (key: string, error: unknown) => void,
  onWriteFailed?: (key: string, error: unknown) => void
): [T, UseLocalDbSetter<T>, () => void] => {
  // Subscribe + snapshot for `useSyncExternalStore`. `subscribe` re-attaches
  // listeners when `key` changes; `getSnapshot` returns the raw string so
  // React's stable-snapshot equality (Object.is) compares cheaply by string
  // identity rather than re-parsing on every render.
  const subscribe = useCallback(
    (onChange: () => void): (() => void) => subscribeToKey(key, onChange),
    [key]
  );
  const getSnapshot = useCallback(
    (): string | null => readRawValue(key),
    [key]
  );
  const rawValue = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  // Parse + validate. Memoizing on (rawValue, validate) keeps `probe` (and
  // therefore the consumer-facing `value`) referentially stable when nothing
  // on disk has changed, even across unrelated parent re-renders.
  const probe = useMemo<StoredValueProbe<T>>(
    () => parseRawValue(rawValue, validate),
    [rawValue, validate]
  );

  // Dedup sentinel: tracks the storage key for which we've already invoked
  // `onCorrupt`. Without this, a 1Hz-timer page (e.g. Distance/Flashcard) on
  // a corrupt key would fire telemetry on every render.
  const reportedKeyRef = useRef<string | null>(null);

  // Mirror dedup for write failures: at most one `onWriteFailed` per failure
  // streak per key. Streaks reset on a successful write so a recovery-then-
  // new-failure case still surfaces.
  const reportedWriteKeyRef = useRef<string | null>(null);

  // Capture latest callbacks in refs so the setter / effect closures stay
  // stable regardless of whether the caller passes inline arrows.
  const onCorruptRef = useRef(onCorrupt);
  useEffect(() => {
    onCorruptRef.current = onCorrupt;
  }, [onCorrupt]);

  const onWriteFailedRef = useRef(onWriteFailed);
  useEffect(() => {
    onWriteFailedRef.current = onWriteFailed;
  }, [onWriteFailed]);

  // Fire onCorrupt at most once per mount per corrupt key, after render —
  // never during render. Cross-key dedup falls out of the
  // `current !== key` comparison: a transition from key-a to key-b leaves
  // `reportedKeyRef.current === "key-a"`, which differs from the new `key`,
  // so the effect re-fires for the new key.
  useEffect(() => {
    if (reportedKeyRef.current === key) {
      return;
    }
    const cb = onCorruptRef.current;
    if (!cb) {
      return;
    }
    if (probe.status === "corrupt") {
      reportedKeyRef.current = key;
      cb(key, probe.raw);
    } else if (probe.status === "read-error") {
      reportedKeyRef.current = key;
      cb(key, probe.error);
    }
  }, [key, probe]);

  const value = useMemo(
    (): T => (probe.status === "valid" ? probe.value : defaultValue),
    [probe, defaultValue]
  );

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

  const probedSetValue = useCallback<UseLocalDbSetter<T>>(
    (next, options): void => {
      // Reset-on-write is the corruption-recovery path for low-stakes
      // single-value consumers (see use-selected-stack.ts:34-37 and
      // use-timer-settings.ts:63-66): a corrupt blob is overwritten by the
      // next user interaction. Multi-record consumers that can't tolerate
      // that — namely useStackLimits, where one byte-flip would otherwise
      // destroy every other stack's saved range — gate writes at the
      // CONSUMER level (use-stack-limits.ts:50-58, 95). Don't add a
      // wrapper-level corrupt-lock here: it would silently break recovery
      // for the single-value consumers without buying any new protection
      // for the multi-record ones.
      const currentProbe = parseRawValue(readRawValue(key), validate);
      const prev =
        currentProbe.status === "valid" ? currentProbe.value : defaultValue;
      const resolved =
        typeof next === "function"
          ? // `as` justified: typeof check cannot narrow `T | ((prev: T) => T)`
            // to the function branch when T is unconstrained — TypeScript
            // can't prove T isn't itself a function type. The hook's
            // JSON-serializable contract makes the updater branch the only
            // inhabitant in practice.
            (next as (prev: T) => T)(prev)
          : next;

      // Persistence is the only thing whose failure should surface as a
      // write failure. A throw from `dispatchKeyChange` (or from a
      // synchronous listener it triggers) AFTER `setItem` already
      // persisted is an event-bus glitch, not a storage failure — folding
      // it into `handleWriteFailure` would falsely fire the user-facing
      // failure toast, skip `onSuccess` (e.g. analytics emits), and stick
      // the dedup latch so a subsequent real write failure on the same
      // key would be silently suppressed.
      //
      // Cost of accepting the dispatch throw silently: same-tab subscribers
      // (including this hook instance) keep stale state until the next
      // unrelated re-render triggers `getSnapshot`. The native `storage`
      // event does not fire same-tab, so the custom event is the only
      // same-tab sync path. We accept that stale-render window because it
      // is strictly less harmful than a false write-failure toast plus a
      // dedup latch that masks the next real failure.
      try {
        window.localStorage.setItem(key, JSON.stringify(resolved));
      } catch (error) {
        handleWriteFailure(error);
        return;
      }
      try {
        dispatchKeyChange(key);
      } catch (dispatchError) {
        if (import.meta.env.DEV) {
          console.warn(
            `[localStorage] dispatchKeyChange threw for key "${key}":`,
            dispatchError
          );
        }
      }
      handleWriteSuccess(options?.onSuccess);
    },
    [key, validate, defaultValue, handleWriteSuccess, handleWriteFailure]
  );

  const removeValue = useCallback((): void => {
    try {
      window.localStorage.removeItem(key);
      dispatchKeyChange(key);
    } catch {
      // No caller currently surfaces remove failures (no `onSuccess` wired
      // through remove), so swallow to mirror prior Mantine behavior.
    }
  }, [key]);

  return [value, probedSetValue, removeValue];
};
