import { readLocalStorageValue, useLocalStorage } from '@mantine/hooks';

export const useLocalDb = (key: string, defaultValue = '') =>
  useLocalStorage({
    key: key,
    defaultValue: readLocalStorageValue({ key: key }) ?? defaultValue,
  });
