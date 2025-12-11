import { readLocalStorageValue, useLocalStorage } from "@mantine/hooks";

export const useLocalDb = (key: string, defaultValue = "") =>
  useLocalStorage({
    key,
    defaultValue: readLocalStorageValue({ key }) ?? defaultValue,
  });
