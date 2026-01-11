import { readLocalStorageValue, useLocalStorage } from "@mantine/hooks";

const getStoredValue = <T extends string>(key: string, defaultValue: T): T => {
  try {
    return (readLocalStorageValue({ key }) as T | undefined) ?? defaultValue;
  } catch {
    return defaultValue;
  }
};

export const useLocalDb = <T extends string = string>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prevState: T) => T)) => void, () => void] =>
  useLocalStorage({
    key,
    defaultValue: getStoredValue(key, defaultValue),
  });
