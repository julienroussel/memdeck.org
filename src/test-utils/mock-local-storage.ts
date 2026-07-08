/** Creates a Map-backed mock localStorage for node test environments */
export const createMockLocalStorage = () => {
  const storage = new Map<string, string>();
  const mockLocalStorage = {
    clear: () => storage.clear(),
    getItem: (key: string) => storage.get(key) ?? null,
    key: (index: number) => {
      const keys = [...storage.keys()];
      return keys[index] ?? null;
    },
    get length() {
      return storage.size;
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
  } satisfies Storage;
  return { mockLocalStorage, storage };
};
