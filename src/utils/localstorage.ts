import { readLocalStorageValue, useLocalStorage } from "@mantine/hooks";
import { useEffect, useRef } from "react";

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
 */
export const useLocalDb = <T>(
  key: string,
  defaultValue: T,
  validate: (value: unknown) => value is T,
  onCorrupt?: (key: string, error: unknown) => void
): [T, (value: T | ((prevState: T) => T)) => void, () => void] => {
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

  // Capture latest onCorrupt in a ref so the deserialize closure (created
  // once for the lifetime of useLocalStorage) can see the current callback
  // without having to re-create the hook config.
  const onCorruptRef = useRef(onCorrupt);
  useEffect(() => {
    onCorruptRef.current = onCorrupt;
  }, [onCorrupt]);

  const probe = probeRef.current;
  const storedDefault = probe.status === "valid" ? probe.value : defaultValue;

  // Recompute the probe and reset the dedup sentinel when `key` changes.
  // We intentionally exclude `validate` from deps: it's typically a stable
  // module-level type guard, and including it would re-probe on every render
  // for callers that pass an inline guard.
  // biome-ignore lint/correctness/useExhaustiveDependencies: validate is expected to be a stable type guard; depending on it would re-probe on every render for inline guards
  useEffect(() => {
    probeRef.current = probeStoredValue(key, validate);
    reportedKeyRef.current = null;
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

  return useLocalStorage({
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
};
