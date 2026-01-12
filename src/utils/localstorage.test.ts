import { afterEach, describe, expect, it, vi } from "vitest";

const mockReadLocalStorageValue = vi.fn();
const mockUseLocalStorage = vi.fn();

vi.mock("@mantine/hooks", () => ({
  readLocalStorageValue: (args: unknown) => mockReadLocalStorageValue(args),
  useLocalStorage: (args: unknown) => mockUseLocalStorage(args),
}));

const { getStoredValue, useLocalDb } = await import("./localstorage");

describe("getStoredValue", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns stored value when it exists", () => {
    mockReadLocalStorageValue.mockReturnValue("stored-value");

    const result = getStoredValue("test-key", "default");

    expect(result).toBe("stored-value");
    expect(mockReadLocalStorageValue).toHaveBeenCalledWith({ key: "test-key" });
  });

  it("returns default value when stored value is undefined", () => {
    mockReadLocalStorageValue.mockReturnValue(undefined);

    const result = getStoredValue("test-key", "default");

    expect(result).toBe("default");
  });

  it("returns default value when stored value is null", () => {
    mockReadLocalStorageValue.mockReturnValue(null);

    const result = getStoredValue("test-key", "default");

    expect(result).toBe("default");
  });

  it("returns stored number value", () => {
    mockReadLocalStorageValue.mockReturnValue(42);

    const result = getStoredValue("test-key", 0);

    expect(result).toBe(42);
  });

  it("returns stored boolean value", () => {
    mockReadLocalStorageValue.mockReturnValue(true);

    const result = getStoredValue("test-key", false);

    expect(result).toBe(true);
  });

  it("returns stored object value", () => {
    const storedObject = { name: "test", value: 123 };
    mockReadLocalStorageValue.mockReturnValue(storedObject);

    const result = getStoredValue("test-key", { name: "", value: 0 });

    expect(result).toEqual(storedObject);
  });

  it("returns stored array value", () => {
    const storedArray = [1, 2, 3];
    mockReadLocalStorageValue.mockReturnValue(storedArray);

    const result = getStoredValue("test-key", [] as number[]);

    expect(result).toEqual([1, 2, 3]);
  });

  it("returns default value when readLocalStorageValue throws", () => {
    mockReadLocalStorageValue.mockImplementation(() => {
      throw new Error("Storage error");
    });

    const result = getStoredValue("test-key", "default");

    expect(result).toBe("default");
  });

  it("logs warning in dev mode when error occurs", () => {
    const originalDev = import.meta.env.DEV;
    import.meta.env.DEV = true;

    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {
      // Suppress console output
    });

    mockReadLocalStorageValue.mockImplementation(() => {
      throw new Error("Storage error");
    });

    getStoredValue("test-key", "default");

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[localStorage] Failed to read key "test-key":',
      expect.any(Error)
    );

    consoleWarnSpy.mockRestore();
    import.meta.env.DEV = originalDev;
  });

  it("preserves false as a valid stored value", () => {
    mockReadLocalStorageValue.mockReturnValue(false);

    const result = getStoredValue("test-key", true);

    expect(result).toBe(false);
  });

  it("preserves zero as a valid stored value", () => {
    mockReadLocalStorageValue.mockReturnValue(0);

    const result = getStoredValue("test-key", 100);

    expect(result).toBe(0);
  });

  it("preserves empty string as a valid stored value", () => {
    mockReadLocalStorageValue.mockReturnValue("");

    const result = getStoredValue("test-key", "default");

    expect(result).toBe("");
  });

  it("preserves empty array as a valid stored value", () => {
    mockReadLocalStorageValue.mockReturnValue([]);

    const result = getStoredValue("test-key", [1, 2, 3]);

    expect(result).toEqual([]);
  });
});

describe("useLocalDb", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("calls useLocalStorage with key and resolved default value", () => {
    mockReadLocalStorageValue.mockReturnValue(undefined);
    mockUseLocalStorage.mockReturnValue(["value", vi.fn(), vi.fn()]);

    useLocalDb("test-key", "default");

    expect(mockUseLocalStorage).toHaveBeenCalledWith({
      key: "test-key",
      defaultValue: "default",
    });
  });

  it("uses stored value as default when available", () => {
    mockReadLocalStorageValue.mockReturnValue("stored-value");
    mockUseLocalStorage.mockReturnValue(["stored-value", vi.fn(), vi.fn()]);

    useLocalDb("test-key", "default");

    expect(mockUseLocalStorage).toHaveBeenCalledWith({
      key: "test-key",
      defaultValue: "stored-value",
    });
  });

  it("returns tuple with value, setter, and remover", () => {
    const mockSetter = vi.fn();
    const mockRemover = vi.fn();
    mockReadLocalStorageValue.mockReturnValue("value");
    mockUseLocalStorage.mockReturnValue(["value", mockSetter, mockRemover]);

    const [value, setValue, removeValue] = useLocalDb("test-key", "default");

    expect(value).toBe("value");
    expect(setValue).toBe(mockSetter);
    expect(removeValue).toBe(mockRemover);
  });

  it("works with number type", () => {
    mockReadLocalStorageValue.mockReturnValue(42);
    mockUseLocalStorage.mockReturnValue([42, vi.fn(), vi.fn()]);

    const [value] = useLocalDb("counter", 0);

    expect(value).toBe(42);
  });

  it("works with boolean type", () => {
    mockReadLocalStorageValue.mockReturnValue(true);
    mockUseLocalStorage.mockReturnValue([true, vi.fn(), vi.fn()]);

    const [value] = useLocalDb("enabled", false);

    expect(value).toBe(true);
  });

  it("works with object type", () => {
    const storedObject = { theme: "dark", fontSize: 14 };
    mockReadLocalStorageValue.mockReturnValue(storedObject);
    mockUseLocalStorage.mockReturnValue([storedObject, vi.fn(), vi.fn()]);

    const [value] = useLocalDb("settings", { theme: "light", fontSize: 12 });

    expect(value).toEqual({ theme: "dark", fontSize: 14 });
  });

  it("works with array type", () => {
    const storedArray = ["item1", "item2"];
    mockReadLocalStorageValue.mockReturnValue(storedArray);
    mockUseLocalStorage.mockReturnValue([storedArray, vi.fn(), vi.fn()]);

    const [value] = useLocalDb("items", [] as string[]);

    expect(value).toEqual(["item1", "item2"]);
  });

  it("falls back to default when storage read fails", () => {
    mockReadLocalStorageValue.mockImplementation(() => {
      throw new Error("Storage error");
    });
    mockUseLocalStorage.mockReturnValue(["default", vi.fn(), vi.fn()]);

    useLocalDb("test-key", "default");

    expect(mockUseLocalStorage).toHaveBeenCalledWith({
      key: "test-key",
      defaultValue: "default",
    });
  });
});
