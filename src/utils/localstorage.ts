import { readLocalStorageValue, useLocalStorage } from "@mantine/hooks";

/**
 * Retrieves a stored value from localStorage with error handling.
 * Returns defaultValue if the key doesn't exist or on any error.
 * Logs errors in development mode for debugging.
 *
 * When a `validate` type guard is provided, the raw value is checked
 * before being returned. If validation fails, `defaultValue` is returned
 * and a warning is logged in development mode.
 */
export const getStoredValue = <T>(
  key: string,
  defaultValue: T,
  validate?: (value: unknown) => value is T
): T => {
  try {
    const raw: unknown = readLocalStorageValue({ key });

    if (raw === undefined || raw === null) {
      return defaultValue;
    }

    if (validate && !validate(raw)) {
      if (import.meta.env.DEV) {
        console.warn(`[localStorage] Validation failed for key "${key}":`, raw);
      }
      return defaultValue;
    }

    return raw as T;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn(`[localStorage] Failed to read key "${key}":`, error);
    }
    return defaultValue;
  }
};

/**
 * A wrapper around Mantine's useLocalStorage with error handling.
 * Supports any JSON-serializable type (string, number, boolean, object, array).
 */
export const useLocalDb = <T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prevState: T) => T)) => void, () => void] =>
  useLocalStorage({
    key,
    defaultValue: getStoredValue(key, defaultValue),
  });
