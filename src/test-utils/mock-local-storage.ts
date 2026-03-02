/** Creates a Map-backed mock localStorage for node test environments */
export const createMockLocalStorage = () => {
  const storage = new Map<string, string>();
  const mockLocalStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
    clear: () => storage.clear(),
    get length() {
      return storage.size;
    },
    key: (index: number) => {
      const keys = [...storage.keys()];
      return keys[index] ?? null;
    },
  } satisfies Storage;
  return { storage, mockLocalStorage };
};
