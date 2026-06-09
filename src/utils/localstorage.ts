import { readLocalStorageValue } from "@mantine/hooks";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import {
  notifyLocalDbCorruption,
  reportLocalDbNotifyFailed,
} from "./localstorage-telemetry";

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
    // Custom `deserialize` so the prototype-stripping reviver applies on this
    // path too — Mantine's default `deserializeJSON` parses without a reviver,
    // which would hand probeStoredValue consumers unstripped objects.
    const raw: unknown = readLocalStorageValue({
      key,
      deserialize: deserializeWithSafeReviver,
    });

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

export type UseLocalDbOptions = {
  onCorrupt?: (key: string, error: unknown) => void;
  onWriteFailed?: (key: string, error: unknown) => void;
};

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

// Reviver-applying replacement for Mantine's default `deserializeJSON`,
// passed to `readLocalStorageValue` by `probeStoredValue` above. Mirrors
// Mantine's malformed-JSON semantics — return the raw string so the caller's
// validator fails on it and the probe classifies it as corrupt.
const deserializeWithSafeReviver = (value: string | undefined): unknown => {
  if (value === undefined) {
    return;
  }
  try {
    return JSON.parse(value, safeJsonReviver);
  } catch {
    return value;
  }
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

// Latest-valid cache slot. `has: false` is the bootstrap sentinel before any
// valid probe has been observed; once a valid probe arrives, the slot flips
// to `has: true` carrying the value AND the key it belongs to. The key is
// embedded so a `key` prop change clears the cache implicitly — readers
// match against the current `key` and fall back to `defaultValue` when the
// cached entry is stale (mirrors the per-key discipline of `reportedKeyRef`).
type LatestValidSlot<T> = { has: false } | { has: true; key: string; value: T };

// Previous-probe-validity cache. Same per-key embedding rationale as
// `LatestValidSlot`: a `key` prop change must NOT make the new key's first
// corrupt probe look like a valid→corrupt transition (which would fire the
// post-mount Mantine toast for what is actually mount-time corruption).
type WasValidSlot = { wasValid: false } | { wasValid: true; key: string };

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
 * Pass `options.onCorrupt` to be notified when the stored value exists but
 * cannot be validated (the type guard returned `false`, or the type guard
 * itself threw). Storage-layer read errors (Safari ITP, private mode)
 * collapse to "absent" — `onCorrupt` is NOT fired for those. Consumers
 * that need to distinguish "absent" from "read errored" call
 * `probeStoredValue` directly. Without `onCorrupt`, the hook silently
 * falls back to `defaultValue`.
 *
 * Pass `options.onWriteFailed` to be notified when a write throws (quota
 * exceeded, Safari private mode, ITP eviction).
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
 *
 * **Cross-tab corruption:** when a cross-tab `storage` event delivers a
 * value that fails JSON.parse / validate, the consumer-facing `value` and
 * the setter's `prev` (for functional updates) both fall back to the most
 * recently-observed valid value rather than `defaultValue`. The on-disk
 * blob is corrupt until the next write, but the user's in-memory state is
 * preserved. A Mantine notification (`notifyLocalDbCorruption`) fires once
 * per valid→corrupt transition so the user knows another tab wrote
 * unreadable data — mount-time corruption stays silent here (consumers
 * that care, e.g. `useStackLimits`, surface their own toast).
 */
export const useLocalDb = <T>(
  key: string,
  defaultValue: T,
  validate: (value: unknown) => value is T,
  { onCorrupt, onWriteFailed }: UseLocalDbOptions = {}
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

  // Latest-valid cache for the rollback fix (issue #628). Updated in the
  // value `useMemo` below; consulted by both the value computation and the
  // setter when the on-disk probe is corrupt.
  const latestValidRef = useRef<LatestValidSlot<T>>({ has: false });

  // Tracks whether the previous probe was valid, so the transition-toast
  // effect can fire a notification on the valid→corrupt edge specifically
  // (and not on mount-time corruption, repeated corrupt events, or
  // cross-tab `clear()` which surfaces as `absent`). The slot embeds the
  // `key` it belongs to — without it, a `key` prop change would leave the
  // boolean `true` from the previous key and the new key's first corrupt
  // probe would falsely fire as a valid→corrupt transition.
  const wasValidRef = useRef<WasValidSlot>({ wasValid: false });

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

  // Cross-tab corruption surface: fires a Mantine toast on the valid→corrupt
  // transition only. `wasValidRef` starts `{ wasValid: false }` so a
  // mount-time corrupt probe stays silent; `absent` (cross-tab `clear()`)
  // is excluded so a deliberate reset doesn't masquerade as corruption.
  // After the toast fires, `wasValidRef` is `{ wasValid: false }` until the
  // next valid probe — a streak of corrupt events doesn't re-toast, but a
  // corrupt→valid→corrupt sequence does (correctly — that's a fresh
  // transition). The `wasValid && key === ...` check rejects stale state
  // from a previous `key` prop value (otherwise a key swap would falsely
  // fire as a transition for the new key's mount-time probe).
  //
  // Asymmetry with `onCorrupt`: this toast effect re-fires on every
  // valid→corrupt transition, but `onCorrupt` is once-per-mount-key (its
  // `reportedKeyRef` latches and never resets on a valid probe). The
  // asymmetry is intentional — telemetry shouldn't repeat for the same
  // session, but UI feedback should track every fresh drift event.
  useEffect(() => {
    const wasValid =
      wasValidRef.current.wasValid && wasValidRef.current.key === key;
    const isValid = probe.status === "valid";
    // Update the ref BEFORE invoking the toast so a throw inside
    // `notifyLocalDbCorruption` (e.g. notifications provider not mounted
    // during prerender or pre-i18n init) doesn't pin `wasValid` true and
    // cause every subsequent probe to re-attempt the toast.
    wasValidRef.current = isValid
      ? { wasValid: true, key }
      : { wasValid: false };
    if (
      wasValid &&
      (probe.status === "corrupt" || probe.status === "read-error")
    ) {
      try {
        notifyLocalDbCorruption(key);
      } catch (notifyError) {
        // Surface the toast-pipeline failure to analytics so a regressed
        // Mantine provider mount or pre-i18n init throw doesn't silently
        // disable corruption toasts in production. The data path keeps
        // working (last-known-valid fallback runs above), but without this
        // breadcrumb the UI signal would vanish with no telemetry trace.
        reportLocalDbNotifyFailed(key, notifyError);
        if (import.meta.env.DEV) {
          console.warn(
            `[localStorage] notifyLocalDbCorruption threw for key "${key}":`,
            notifyError
          );
        }
      }
    }
  }, [key, probe]);

  const value = useMemo((): T => {
    if (probe.status === "valid") {
      latestValidRef.current = { has: true, key, value: probe.value };
      return probe.value;
    }
    if (probe.status === "absent") {
      return defaultValue;
    }
    // corrupt | read-error: prefer last-known-valid in-memory state so a
    // cross-tab corrupt write doesn't roll back the user's in-flight edits
    // to `defaultValue`. The cached entry must belong to the current `key`
    // — otherwise a key swap would silently surface the previous key's
    // value when the new key's stored blob is corrupt or invalid.
    if (latestValidRef.current.has && latestValidRef.current.key === key) {
      return latestValidRef.current.value;
    }
    return defaultValue;
  }, [probe, defaultValue, key]);

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
      //
      // Cross-tab corruption rollback (issue #628): when the on-disk probe
      // is corrupt/read-error, prefer `latestValidRef.current.value` as
      // `prev` for functional updates so multi-field record consumers like
      // `useTimerSettings` ({ enabled, duration }) don't drop the user's
      // last-saved fields. `absent` keeps `defaultValue` semantics — a
      // cross-tab `clear()` is a deliberate reset, not a corruption event.
      // The cached entry must belong to the current `key`; otherwise a key
      // swap would feed the previous key's value into a functional updater
      // and persist a record that mixes both keys' state.
      const currentProbe = parseRawValue(readRawValue(key), validate);
      let prev: T;
      if (currentProbe.status === "valid") {
        prev = currentProbe.value;
      } else if (currentProbe.status === "absent") {
        prev = defaultValue;
      } else if (
        latestValidRef.current.has &&
        latestValidRef.current.key === key
      ) {
        prev = latestValidRef.current.value;
      } else {
        prev = defaultValue;
      }
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
