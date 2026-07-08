import type {
  MantineColorScheme,
  MantineColorSchemeManager,
} from "@mantine/core";
import { handleLocalDbWriteFailed } from "./localstorage-telemetry";

const isMantineColorScheme = (value: unknown): value is MantineColorScheme =>
  value === "auto" || value === "dark" || value === "light";

/**
 * Color-scheme storage manager that routes write failures through the same
 * telemetry path as `useLocalDb` (Mantine notification + `LocalDbWriteFailed`
 * analytics event) instead of Mantine's stock silent-swallow on `setItem`
 * throws. Cross-tab sync (`storage` event) and invalid-value fallback mirror
 * Mantine's built-in `localStorageColorSchemeManager`.
 *
 * Invoke once at module scope — see `src/provider.tsx`. The
 * `hasReportedFailure` latch is closure-scoped, so calling the factory inside
 * a component body would reset it on every render and re-fire analytics on
 * each toggle.
 */
export const createColorSchemeManager = (
  key: string
): MantineColorSchemeManager => {
  let handleStorageEvent: ((event: StorageEvent) => void) | null = null;
  let hasReportedFailure = false;

  return {
    clear: () => {
      // Mirrors useLocalDb.removeValue in src/utils/localstorage.ts: remove
      // failures are not surfaced — no caller wires success/failure through
      // this path.
      try {
        window.localStorage.removeItem(key);
      } catch {
        // intentional: see comment above.
      }
    },
    get: (defaultValue) => {
      try {
        const stored = window.localStorage.getItem(key);
        return isMantineColorScheme(stored) ? stored : defaultValue;
      } catch {
        return defaultValue;
      }
    },
    set: (value) => {
      try {
        window.localStorage.setItem(key, value);
        hasReportedFailure = false;
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn(`[localStorage] Write failed for key "${key}":`, error);
        }
        if (!hasReportedFailure) {
          hasReportedFailure = true;
          handleLocalDbWriteFailed(key, error);
        }
      }
    },
    subscribe: (onUpdate) => {
      if (handleStorageEvent) {
        window.removeEventListener("storage", handleStorageEvent);
      }
      handleStorageEvent = (event) => {
        if (
          event.storageArea === window.localStorage &&
          event.key === key &&
          isMantineColorScheme(event.newValue)
        ) {
          onUpdate(event.newValue);
        }
      };
      window.addEventListener("storage", handleStorageEvent);
    },
    unsubscribe: () => {
      if (handleStorageEvent) {
        window.removeEventListener("storage", handleStorageEvent);
        handleStorageEvent = null;
      }
    },
  };
};
