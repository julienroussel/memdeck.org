import { readLocalStorageValue, useLocalStorage } from "@mantine/hooks";

/**
 * Retrieves a stored value from localStorage with error handling.
 * Returns defaultValue if the key doesn't exist or on any error.
 */
const getStoredValue = <T>(key: string, defaultValue: T): T => {
  try {
    return (readLocalStorageValue({ key }) as T | undefined) ?? defaultValue;
  } catch {
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
