import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockReadLocalStorageValue = vi.fn();
const mockUseLocalStorage = vi.fn();

vi.mock("@mantine/hooks", () => ({
  readLocalStorageValue: (args: unknown) => mockReadLocalStorageValue(args),
  useLocalStorage: (args: unknown) => mockUseLocalStorage(args),
}));

const { getStoredValue, probeStoredValue, useLocalDb } = await import(
  "./localstorage"
);

// --- Shared validators for tests ---

const isString = (value: unknown): value is string => typeof value === "string";

const isNumber = (value: unknown): value is number => typeof value === "number";

const isBool = (value: unknown): value is boolean => typeof value === "boolean";

const isNumberArray = (value: unknown): value is number[] =>
  Array.isArray(value) && value.every((v) => typeof v === "number");

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((v) => typeof v === "string");

type TestObj = { name: string; value: number };
const isTestObj = (value: unknown): value is TestObj =>
  typeof value === "object" &&
  value !== null &&
  "name" in value &&
  "value" in value &&
  typeof (value as TestObj).name === "string" &&
  typeof (value as TestObj).value === "number";

const isPositiveNumber = (value: unknown): value is number =>
  typeof value === "number" && value > 0;

describe("getStoredValue", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns stored value when it exists", () => {
    mockReadLocalStorageValue.mockReturnValue("stored-value");

    const result = getStoredValue("test-key", "default", isString);

    expect(result).toBe("stored-value");
    expect(mockReadLocalStorageValue).toHaveBeenCalledWith({ key: "test-key" });
  });

  it("returns default value when stored value is undefined", () => {
    mockReadLocalStorageValue.mockReturnValue(undefined);

    const result = getStoredValue("test-key", "default", isString);

    expect(result).toBe("default");
  });

  it("returns default value when stored value is null", () => {
    mockReadLocalStorageValue.mockReturnValue(null);

    const result = getStoredValue("test-key", "default", isString);

    expect(result).toBe("default");
  });

  it("returns stored number value", () => {
    mockReadLocalStorageValue.mockReturnValue(42);

    const result = getStoredValue("test-key", 0, isNumber);

    expect(result).toBe(42);
  });

  it("returns stored boolean value", () => {
    mockReadLocalStorageValue.mockReturnValue(true);

    const result = getStoredValue("test-key", false, isBool);

    expect(result).toBe(true);
  });

  it("returns stored object value", () => {
    const storedObject = { name: "test", value: 123 };
    mockReadLocalStorageValue.mockReturnValue(storedObject);

    const result = getStoredValue(
      "test-key",
      { name: "", value: 0 },
      isTestObj
    );

    expect(result).toEqual(storedObject);
  });

  it("returns stored array value", () => {
    const storedArray = [1, 2, 3];
    mockReadLocalStorageValue.mockReturnValue(storedArray);

    const result = getStoredValue("test-key", [] as number[], isNumberArray);

    expect(result).toEqual([1, 2, 3]);
  });

  it("returns default value when readLocalStorageValue throws", () => {
    mockReadLocalStorageValue.mockImplementation(() => {
      throw new Error("Storage error");
    });

    const result = getStoredValue("test-key", "default", isString);

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

    getStoredValue("test-key", "default", isString);

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[localStorage] Failed to read key "test-key":',
      expect.any(Error)
    );

    consoleWarnSpy.mockRestore();
    import.meta.env.DEV = originalDev;
  });

  it("preserves false as a valid stored value", () => {
    mockReadLocalStorageValue.mockReturnValue(false);

    const result = getStoredValue("test-key", true, isBool);

    expect(result).toBe(false);
  });

  it("preserves zero as a valid stored value", () => {
    mockReadLocalStorageValue.mockReturnValue(0);

    const result = getStoredValue("test-key", 100, isNumber);

    expect(result).toBe(0);
  });

  it("preserves empty string as a valid stored value", () => {
    mockReadLocalStorageValue.mockReturnValue("");

    const result = getStoredValue("test-key", "default", isString);

    expect(result).toBe("");
  });

  it("preserves empty array as a valid stored value", () => {
    mockReadLocalStorageValue.mockReturnValue([]);

    const result = getStoredValue("test-key", [1, 2, 3], isNumberArray);

    expect(result).toEqual([]);
  });
});

describe("getStoredValue with validate", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns stored value when validator passes", () => {
    mockReadLocalStorageValue.mockReturnValue("valid-string");

    const result = getStoredValue("test-key", "default", isString);

    expect(result).toBe("valid-string");
  });

  it("returns default value when validator rejects stored value", () => {
    mockReadLocalStorageValue.mockReturnValue(42);

    const result = getStoredValue("test-key", "default", isString);

    expect(result).toBe("default");
  });

  it("returns default value when stored number fails a stricter validator", () => {
    mockReadLocalStorageValue.mockReturnValue(-5);

    const result = getStoredValue("test-key", 1, isPositiveNumber);

    expect(result).toBe(1);
  });

  it("returns stored number when it passes a stricter validator", () => {
    mockReadLocalStorageValue.mockReturnValue(10);

    const result = getStoredValue("test-key", 1, isPositiveNumber);

    expect(result).toBe(10);
  });

  it("returns default value when stored value is undefined with validator", () => {
    mockReadLocalStorageValue.mockReturnValue(undefined);

    const result = getStoredValue("test-key", "default", isString);

    expect(result).toBe("default");
  });

  it("returns default value when stored value is null with validator", () => {
    mockReadLocalStorageValue.mockReturnValue(null);

    const result = getStoredValue("test-key", "default", isString);

    expect(result).toBe("default");
  });

  it("returns default value when readLocalStorageValue throws with validator", () => {
    mockReadLocalStorageValue.mockImplementation(() => {
      throw new Error("Storage error");
    });

    const result = getStoredValue("test-key", "default", isString);

    expect(result).toBe("default");
  });

  it("logs warning in dev mode when validation fails", () => {
    const originalDev = import.meta.env.DEV;
    import.meta.env.DEV = true;

    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {
      // Suppress console output
    });

    mockReadLocalStorageValue.mockReturnValue(123);

    getStoredValue("test-key", "default", isString);

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[localStorage] Validation failed for key "test-key":',
      123
    );

    consoleWarnSpy.mockRestore();
    import.meta.env.DEV = originalDev;
  });

  it("does not call validator when stored value is undefined", () => {
    mockReadLocalStorageValue.mockReturnValue(undefined);

    const validator = vi.fn(() => true) as unknown as (
      value: unknown
    ) => value is string;

    getStoredValue("test-key", "default", validator);

    expect(validator).not.toHaveBeenCalled();
  });

  it("does not call validator when stored value is null", () => {
    mockReadLocalStorageValue.mockReturnValue(null);

    const validator = vi.fn(() => true) as unknown as (
      value: unknown
    ) => value is string;

    getStoredValue("test-key", "default", validator);

    expect(validator).not.toHaveBeenCalled();
  });

  it("works with object validators", () => {
    const isSettings = (
      value: unknown
    ): value is { theme: string; fontSize: number } =>
      typeof value === "object" &&
      value !== null &&
      "theme" in value &&
      "fontSize" in value &&
      typeof (value as { theme: unknown }).theme === "string" &&
      typeof (value as { fontSize: unknown }).fontSize === "number";

    mockReadLocalStorageValue.mockReturnValue({
      theme: "dark",
      fontSize: 14,
    });

    const result = getStoredValue(
      "settings",
      { theme: "light", fontSize: 12 },
      isSettings
    );

    expect(result).toEqual({ theme: "dark", fontSize: 14 });
  });

  it("rejects invalid object shape with object validator", () => {
    const isSettings = (
      value: unknown
    ): value is { theme: string; fontSize: number } =>
      typeof value === "object" &&
      value !== null &&
      "theme" in value &&
      "fontSize" in value &&
      typeof (value as { theme: unknown }).theme === "string" &&
      typeof (value as { fontSize: unknown }).fontSize === "number";

    mockReadLocalStorageValue.mockReturnValue({
      theme: 123,
      fontSize: "not-a-number",
    });

    const result = getStoredValue(
      "settings",
      { theme: "light", fontSize: 12 },
      isSettings
    );

    expect(result).toEqual({ theme: "light", fontSize: 12 });
  });

  it("preserves falsy values that pass validation", () => {
    mockReadLocalStorageValue.mockReturnValue(0);

    const result = getStoredValue("test-key", 100, isNumber);

    expect(result).toBe(0);
  });

  it("preserves empty string that passes validation", () => {
    mockReadLocalStorageValue.mockReturnValue("");

    const result = getStoredValue("test-key", "default", isString);

    expect(result).toBe("");
  });
});

describe("probeStoredValue", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns { status: 'valid' } when stored value passes validation", () => {
    mockReadLocalStorageValue.mockReturnValue("ok");

    const probe = probeStoredValue("test-key", isString);

    expect(probe).toEqual({ status: "valid", value: "ok" });
  });

  it("returns { status: 'absent' } when stored value is undefined", () => {
    mockReadLocalStorageValue.mockReturnValue(undefined);

    const probe = probeStoredValue("test-key", isString);

    expect(probe).toEqual({ status: "absent" });
  });

  it("returns { status: 'absent' } when stored value is null", () => {
    mockReadLocalStorageValue.mockReturnValue(null);

    const probe = probeStoredValue("test-key", isString);

    expect(probe).toEqual({ status: "absent" });
  });

  it("returns { status: 'corrupt' } when stored value fails validation", () => {
    mockReadLocalStorageValue.mockReturnValue(123);

    const probe = probeStoredValue("test-key", isString);

    expect(probe).toEqual({ status: "corrupt", raw: 123 });
  });

  it("returns { status: 'read-error', error } when readLocalStorageValue throws", () => {
    const readError = new Error("SecurityError: ITP read denied");
    mockReadLocalStorageValue.mockImplementation(() => {
      throw readError;
    });

    const probe = probeStoredValue("test-key", isString);

    expect(probe).toEqual({ status: "read-error", error: readError });
  });

  it("logs a DEV warning when the read throws", () => {
    const originalDev = import.meta.env.DEV;
    import.meta.env.DEV = true;

    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {
      // Suppress console output
    });

    mockReadLocalStorageValue.mockImplementation(() => {
      throw new Error("Storage error");
    });

    probeStoredValue("test-key", isString);

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[localStorage] Failed to read key "test-key":',
      expect.any(Error)
    );

    consoleWarnSpy.mockRestore();
    import.meta.env.DEV = originalDev;
  });
});

describe("useLocalDb", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("calls useLocalStorage with key and resolved default value", () => {
    mockReadLocalStorageValue.mockReturnValue(undefined);
    mockUseLocalStorage.mockReturnValue(["value", vi.fn(), vi.fn()]);

    renderHook(() => useLocalDb("test-key", "default", isString));

    expect(mockUseLocalStorage).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "test-key",
        defaultValue: "default",
      })
    );
  });

  it("uses stored value as default when available", () => {
    mockReadLocalStorageValue.mockReturnValue("stored-value");
    mockUseLocalStorage.mockReturnValue(["stored-value", vi.fn(), vi.fn()]);

    renderHook(() => useLocalDb("test-key", "default", isString));

    expect(mockUseLocalStorage).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "test-key",
        defaultValue: "stored-value",
      })
    );
  });

  it("returns tuple with value, wrapped setter, and remover", () => {
    const mockSetter = vi.fn();
    const mockRemover = vi.fn();
    mockReadLocalStorageValue.mockReturnValue("value");
    mockUseLocalStorage.mockReturnValue(["value", mockSetter, mockRemover]);

    const { result } = renderHook(() =>
      useLocalDb("test-key", "default", isString)
    );

    const [value, setValue, removeValue] = result.current;
    expect(value).toBe("value");
    // The setter is wrapped to add a post-write probe, so it is not the same
    // function reference as Mantine's setter — but invoking it must still
    // forward the value through to the underlying setter via a function
    // updater so the probe and Mantine resolve against the same `prev`.
    expect(setValue).toBeInstanceOf(Function);
    expect(setValue).not.toBe(mockSetter);
    setValue("next");
    expect(mockSetter).toHaveBeenCalledTimes(1);
    const cbArg = mockSetter.mock.calls[0]?.[0];
    expect(typeof cbArg).toBe("function");
    // `as` justified: `cbArg` is typed `unknown` from the mock's call array,
    // but we just verified it's a function. Invoking it with any prev should
    // resolve to the static "next" value the caller passed.
    expect((cbArg as (prev: unknown) => unknown)("anything")).toBe("next");
    expect(removeValue).toBe(mockRemover);
  });

  it("works with number type", () => {
    mockReadLocalStorageValue.mockReturnValue(42);
    mockUseLocalStorage.mockReturnValue([42, vi.fn(), vi.fn()]);

    const { result } = renderHook(() => useLocalDb("counter", 0, isNumber));

    expect(result.current[0]).toBe(42);
  });

  it("works with boolean type", () => {
    mockReadLocalStorageValue.mockReturnValue(true);
    mockUseLocalStorage.mockReturnValue([true, vi.fn(), vi.fn()]);

    const { result } = renderHook(() => useLocalDb("enabled", false, isBool));

    expect(result.current[0]).toBe(true);
  });

  it("works with object type", () => {
    const storedObject = { name: "test", value: 123 };
    mockReadLocalStorageValue.mockReturnValue(storedObject);
    mockUseLocalStorage.mockReturnValue([storedObject, vi.fn(), vi.fn()]);

    type Settings = { name: string; value: number };
    const isSettings = (v: unknown): v is Settings =>
      typeof v === "object" &&
      v !== null &&
      "name" in v &&
      "value" in v &&
      typeof (v as Settings).name === "string" &&
      typeof (v as Settings).value === "number";

    const { result } = renderHook(() =>
      useLocalDb("settings", { name: "", value: 0 }, isSettings)
    );

    expect(result.current[0]).toEqual({ name: "test", value: 123 });
  });

  it("works with array type", () => {
    const storedArray = ["item1", "item2"];
    mockReadLocalStorageValue.mockReturnValue(storedArray);
    mockUseLocalStorage.mockReturnValue([storedArray, vi.fn(), vi.fn()]);

    const { result } = renderHook(() =>
      useLocalDb("items", [] as string[], isStringArray)
    );

    expect(result.current[0]).toEqual(["item1", "item2"]);
  });

  it("falls back to default when storage read fails", () => {
    mockReadLocalStorageValue.mockImplementation(() => {
      throw new Error("Storage error");
    });
    mockUseLocalStorage.mockReturnValue(["default", vi.fn(), vi.fn()]);

    renderHook(() => useLocalDb("test-key", "default", isString));

    expect(mockUseLocalStorage).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "test-key",
        defaultValue: "default",
      })
    );
  });

  describe("onCorrupt callback", () => {
    it("does not invoke onCorrupt when the stored value is valid", () => {
      mockReadLocalStorageValue.mockReturnValue("stored");
      mockUseLocalStorage.mockReturnValue(["stored", vi.fn(), vi.fn()]);
      const onCorrupt = vi.fn();

      renderHook(() => useLocalDb("test-key", "default", isString, onCorrupt));

      expect(onCorrupt).not.toHaveBeenCalled();
    });

    it("does not invoke onCorrupt when the stored value is absent", () => {
      mockReadLocalStorageValue.mockReturnValue(undefined);
      mockUseLocalStorage.mockReturnValue(["default", vi.fn(), vi.fn()]);
      const onCorrupt = vi.fn();

      renderHook(() => useLocalDb("test-key", "default", isString, onCorrupt));

      expect(onCorrupt).not.toHaveBeenCalled();
    });

    it("invokes onCorrupt with the key and raw value when validation fails", () => {
      mockReadLocalStorageValue.mockReturnValue(123);
      mockUseLocalStorage.mockReturnValue(["default", vi.fn(), vi.fn()]);
      const onCorrupt = vi.fn();

      renderHook(() => useLocalDb("test-key", "default", isString, onCorrupt));

      expect(onCorrupt).toHaveBeenCalledTimes(1);
      expect(onCorrupt).toHaveBeenCalledWith("test-key", 123);
    });

    it("invokes onCorrupt with the read error when the storage read throws", () => {
      const readError = new Error("Storage read denied");
      mockReadLocalStorageValue.mockImplementation(() => {
        throw readError;
      });
      mockUseLocalStorage.mockReturnValue(["default", vi.fn(), vi.fn()]);
      const onCorrupt = vi.fn();

      renderHook(() => useLocalDb("test-key", "default", isString, onCorrupt));

      expect(onCorrupt).toHaveBeenCalledTimes(1);
      expect(onCorrupt).toHaveBeenCalledWith("test-key", readError);
    });

    it("falls back to defaultValue when corrupt and onCorrupt is provided", () => {
      mockReadLocalStorageValue.mockReturnValue(123);
      mockUseLocalStorage.mockReturnValue(["default", vi.fn(), vi.fn()]);
      const onCorrupt = vi.fn();

      renderHook(() => useLocalDb("test-key", "default", isString, onCorrupt));

      expect(mockUseLocalStorage).toHaveBeenCalledWith(
        expect.objectContaining({
          key: "test-key",
          defaultValue: "default",
        })
      );
    });

    it("works without onCorrupt — no throw on corrupt value", () => {
      mockReadLocalStorageValue.mockReturnValue(123);
      mockUseLocalStorage.mockReturnValue(["default", vi.fn(), vi.fn()]);

      expect(() =>
        renderHook(() => useLocalDb("test-key", "default", isString))
      ).not.toThrow();
    });

    it("fires onCorrupt only once across many re-renders for the same corrupt key", () => {
      mockReadLocalStorageValue.mockReturnValue(123);
      mockUseLocalStorage.mockReturnValue(["default", vi.fn(), vi.fn()]);
      const onCorrupt = vi.fn();

      const { rerender } = renderHook(() =>
        useLocalDb("test-key", "default", isString, onCorrupt)
      );

      // Simulate a high-frequency render loop (e.g. 1Hz timer page).
      for (let i = 0; i < 20; i++) {
        rerender();
      }

      expect(onCorrupt).toHaveBeenCalledTimes(1);
      expect(onCorrupt).toHaveBeenCalledWith("test-key", 123);
    });

    it("resets onCorrupt dedup when key changes", () => {
      // Both keys are corrupt — dedup must be per-key, not per-mount.
      mockReadLocalStorageValue.mockReturnValue(123);
      mockUseLocalStorage.mockReturnValue(["default", vi.fn(), vi.fn()]);
      const onCorrupt = vi.fn();

      const { rerender } = renderHook(
        ({ k }: { k: string }) => useLocalDb(k, "default", isString, onCorrupt),
        { initialProps: { k: "key-a" } }
      );

      rerender({ k: "key-b" });

      expect(onCorrupt).toHaveBeenCalledTimes(2);
      expect(onCorrupt).toHaveBeenNthCalledWith(1, "key-a", 123);
      expect(onCorrupt).toHaveBeenNthCalledWith(2, "key-b", 123);
    });

    it("calls onCorrupt from the deserialize path on JSON.parse error", () => {
      // Probe path is clean (absent), so only the deserialize callback can
      // fire onCorrupt — exercising the parse-error branch.
      mockReadLocalStorageValue.mockReturnValue(undefined);
      let capturedDeserialize:
        | ((raw: string | undefined) => unknown)
        | undefined;
      mockUseLocalStorage.mockImplementation(
        (args: { deserialize?: (raw: string | undefined) => unknown }) => {
          capturedDeserialize = args.deserialize;
          return ["default", vi.fn(), vi.fn()];
        }
      );
      const onCorrupt = vi.fn();

      renderHook(() => useLocalDb("test-key", "default", isString, onCorrupt));

      expect(capturedDeserialize).toBeDefined();
      // Probe path was clean, so no onCorrupt fired yet.
      expect(onCorrupt).not.toHaveBeenCalled();

      // Cross-tab read with malformed JSON.
      const result = capturedDeserialize?.("{not valid json");

      expect(result).toBe("default");
      expect(onCorrupt).toHaveBeenCalledTimes(1);
      expect(onCorrupt).toHaveBeenCalledWith("test-key", expect.any(Error));
    });

    it("calls onCorrupt from the deserialize path on validate-failure", () => {
      mockReadLocalStorageValue.mockReturnValue(undefined);
      let capturedDeserialize:
        | ((raw: string | undefined) => unknown)
        | undefined;
      mockUseLocalStorage.mockImplementation(
        (args: { deserialize?: (raw: string | undefined) => unknown }) => {
          capturedDeserialize = args.deserialize;
          return ["default", vi.fn(), vi.fn()];
        }
      );
      const onCorrupt = vi.fn();

      renderHook(() => useLocalDb("test-key", "default", isString, onCorrupt));

      expect(capturedDeserialize).toBeDefined();
      expect(onCorrupt).not.toHaveBeenCalled();

      // Valid JSON, but the parsed value fails the type guard.
      const raw = JSON.stringify(42);
      const result = capturedDeserialize?.(raw);

      expect(result).toBe("default");
      expect(onCorrupt).toHaveBeenCalledTimes(1);
      expect(onCorrupt).toHaveBeenCalledWith("test-key", raw);
    });

    it("does not call onCorrupt for a clean read", () => {
      mockReadLocalStorageValue.mockReturnValue("stored");
      let capturedDeserialize:
        | ((raw: string | undefined) => unknown)
        | undefined;
      mockUseLocalStorage.mockImplementation(
        (args: { deserialize?: (raw: string | undefined) => unknown }) => {
          capturedDeserialize = args.deserialize;
          return ["stored", vi.fn(), vi.fn()];
        }
      );
      const onCorrupt = vi.fn();

      const { rerender } = renderHook(() =>
        useLocalDb("test-key", "default", isString, onCorrupt)
      );

      // Multiple renders + a clean deserialize — should never fire onCorrupt.
      rerender();
      rerender();
      capturedDeserialize?.(JSON.stringify("fresh-value"));

      expect(onCorrupt).not.toHaveBeenCalled();
    });
  });

  describe("setter identity stability", () => {
    it("returns the same setter reference across re-renders when key is unchanged", () => {
      mockReadLocalStorageValue.mockReturnValue("value");
      mockUseLocalStorage.mockReturnValue(["value", vi.fn(), vi.fn()]);

      const { result, rerender } = renderHook(() =>
        useLocalDb("test-key", "default", isString)
      );

      const initialSetter = result.current[1];
      rerender();
      rerender();

      expect(result.current[1]).toBe(initialSetter);
    });

    it("returns a new setter reference when key changes", () => {
      mockReadLocalStorageValue.mockReturnValue("value");
      mockUseLocalStorage.mockReturnValue(["value", vi.fn(), vi.fn()]);

      const { result, rerender } = renderHook(
        ({ k }: { k: string }) => useLocalDb(k, "default", isString),
        { initialProps: { k: "key-a" } }
      );

      const initialSetter = result.current[1];
      rerender({ k: "key-b" });

      expect(result.current[1]).not.toBe(initialSetter);
    });
  });

  describe("write-failure handling", () => {
    // happy-dom's window.localStorage isn't a real Storage instance whose
    // methods can be spied via the prototype, and `vi.spyOn` on the live
    // localStorage object errors with "property is not defined." Replace the
    // global with a hand-rolled mock for each test instead and restore via
    // vi.unstubAllGlobals.
    let setItemMock: ReturnType<typeof vi.fn>;

    const useFakeLocalStorage = (
      impl: (key: string, value: string) => void
    ) => {
      setItemMock = vi.fn(impl);
      vi.stubGlobal("localStorage", {
        setItem: setItemMock,
        getItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
        key: vi.fn(),
        length: 0,
      });
    };

    afterEach(() => {
      vi.clearAllMocks();
      vi.unstubAllGlobals();
    });

    const setupHook = (key = "test-key", value: unknown = "stored-value") => {
      // The wrapped setter now invokes Mantine's setValue with a function
      // updater unconditionally; the mock must run that callback so the
      // closed-over `resolved` is assigned before the synchronous probe.
      const mockSetter = vi.fn((next: unknown) => {
        if (typeof next === "function") {
          // `as` justified: the callback is typed against the user's T, but
          // the test mock is generic over `unknown`. We just need to invoke
          // it with the current value to mirror Mantine's behavior.
          (next as (prev: unknown) => unknown)(value);
        }
      });
      const mockRemover = vi.fn();
      mockReadLocalStorageValue.mockReturnValue(value);
      mockUseLocalStorage.mockReturnValue([value, mockSetter, mockRemover]);
      return { mockSetter, mockRemover, key };
    };

    it("skips onWriteFailed when the probe write succeeds", () => {
      const { key, mockSetter } = setupHook();
      const onWriteFailed = vi.fn();
      useFakeLocalStorage(() => {
        // Pretend the write succeeded.
      });

      const { result } = renderHook(() =>
        useLocalDb(key, "default", isString, undefined, onWriteFailed)
      );

      result.current[1]("next-value");

      expect(onWriteFailed).not.toHaveBeenCalled();
      expect(setItemMock).toHaveBeenCalledWith(
        key,
        JSON.stringify("next-value")
      );
      expect(mockSetter).toHaveBeenCalledTimes(1);
    });

    it("forwards the error to onWriteFailed when the probe throws", () => {
      const { key, mockSetter } = setupHook();
      const onWriteFailed = vi.fn();
      const quotaError = new DOMException("quota", "QuotaExceededError");
      useFakeLocalStorage(() => {
        throw quotaError;
      });

      const { result } = renderHook(() =>
        useLocalDb(key, "default", isString, undefined, onWriteFailed)
      );

      result.current[1]("next-value");

      expect(onWriteFailed).toHaveBeenCalledTimes(1);
      expect(onWriteFailed).toHaveBeenCalledWith(key, quotaError);
      expect(mockSetter).toHaveBeenCalledTimes(1);
    });

    it("fires onWriteFailed at most once per consecutive failure streak per key (dedup)", () => {
      const { key, mockSetter } = setupHook();
      const onWriteFailed = vi.fn();
      useFakeLocalStorage(() => {
        throw new DOMException("quota", "QuotaExceededError");
      });

      const { result } = renderHook(() =>
        useLocalDb(key, "default", isString, undefined, onWriteFailed)
      );

      result.current[1]("a");
      result.current[1]("b");
      result.current[1]("c");

      expect(onWriteFailed).toHaveBeenCalledTimes(1);
      expect(setItemMock).toHaveBeenCalledTimes(3);
      expect(mockSetter).toHaveBeenCalledTimes(3);
    });

    it("re-fires onWriteFailed after a successful write resets the streak", () => {
      const { key, mockSetter } = setupHook();
      const onWriteFailed = vi.fn();
      const quotaError = new DOMException("quota", "QuotaExceededError");
      const setItemImpl = vi
        .fn<(k: string, v: string) => void>()
        .mockImplementationOnce(() => {
          throw quotaError;
        })
        .mockImplementationOnce(() => {
          // Pretend success — should reset the dedup streak.
        })
        .mockImplementationOnce(() => {
          throw quotaError;
        });
      useFakeLocalStorage((k, v) => setItemImpl(k, v));

      const { result } = renderHook(() =>
        useLocalDb(key, "default", isString, undefined, onWriteFailed)
      );

      result.current[1]("a");
      result.current[1]("b");
      result.current[1]("c");

      expect(onWriteFailed).toHaveBeenCalledTimes(2);
      expect(setItemMock).toHaveBeenCalledTimes(3);
      expect(mockSetter).toHaveBeenCalledTimes(3);
    });

    it("fires onWriteFailed independently for each key (dedup resets on key change)", () => {
      mockReadLocalStorageValue.mockReturnValue("v");
      // Mantine-mirroring setter: invoke the callback so the probe runs.
      const mockSetter = vi.fn((next: unknown) => {
        if (typeof next === "function") {
          // `as` justified: see setupHook — generic test mock over `unknown`.
          (next as (prev: unknown) => unknown)("v");
        }
      });
      mockUseLocalStorage.mockReturnValue(["v", mockSetter, vi.fn()]);
      const onWriteFailed = vi.fn();
      useFakeLocalStorage(() => {
        throw new DOMException("quota", "QuotaExceededError");
      });

      const { result, rerender } = renderHook(
        ({ k }: { k: string }) =>
          useLocalDb(k, "default", isString, undefined, onWriteFailed),
        { initialProps: { k: "key-a" } }
      );

      result.current[1]("x");
      rerender({ k: "key-b" });
      result.current[1]("y");

      expect(onWriteFailed).toHaveBeenCalledTimes(2);
      expect(onWriteFailed).toHaveBeenNthCalledWith(
        1,
        "key-a",
        expect.any(Error)
      );
      expect(onWriteFailed).toHaveBeenNthCalledWith(
        2,
        "key-b",
        expect.any(Error)
      );
    });

    it("resolves function-updater payloads against the current value for the probe", () => {
      mockReadLocalStorageValue.mockReturnValue(10);
      // Mirror Mantine: invoke the callback with the current value so the
      // closed-over `resolved` is populated before the probe runs.
      const mockSetter = vi.fn((next: unknown) => {
        if (typeof next === "function") {
          // `as` justified: see setupHook — generic test mock over `unknown`.
          (next as (prev: number) => number)(10);
        }
      });
      mockUseLocalStorage.mockReturnValue([10, mockSetter, vi.fn()]);
      useFakeLocalStorage(() => {
        // Pretend success.
      });

      const { result } = renderHook(() =>
        useLocalDb<number>("counter", 0, isNumber)
      );

      result.current[1]((prev) => prev + 5);

      expect(setItemMock).toHaveBeenCalledWith("counter", JSON.stringify(15));
    });

    it("does not throw when no onWriteFailed callback is provided", () => {
      setupHook();
      useFakeLocalStorage(() => {
        throw new DOMException("quota", "QuotaExceededError");
      });

      const { result } = renderHook(() =>
        useLocalDb("test-key", "default", isString)
      );

      expect(() => result.current[1]("next")).not.toThrow();
      expect(() => result.current[1]("again")).not.toThrow();
    });

    it("isolates onWriteFailed exceptions: setter does not throw and dedup latch is still set", () => {
      // Realistic failure mode: i18next.t or notifications.show could throw
      // (e.g. provider not yet mounted). The wrapped setter must swallow the
      // callback exception so the consumer's UI handler doesn't crash, AND
      // the dedup latch must still register so the next failure doesn't
      // re-fire telemetry on every render.
      const { key } = setupHook();
      const onWriteFailed = vi.fn(() => {
        throw new Error("notifications provider not mounted");
      });
      useFakeLocalStorage(() => {
        throw new DOMException("quota", "QuotaExceededError");
      });

      const { result } = renderHook(() =>
        useLocalDb(key, "default", isString, undefined, onWriteFailed)
      );

      expect(() => result.current[1]("next")).not.toThrow();
      // Second consecutive failure with the same key: dedup latch was set on
      // the first call despite the callback throwing, so onWriteFailed is
      // not invoked again.
      expect(() => result.current[1]("again")).not.toThrow();

      expect(onWriteFailed).toHaveBeenCalledTimes(1);
    });

    it("does not write the literal string 'undefined' when the updater is deferred", () => {
      // Regression for the eager-state-skipped path. React calls setState
      // updaters lazily when there are pending lanes on the fiber (e.g.
      // chained setters in one handler). The previous implementation read a
      // closure variable assigned inside the updater AFTER `setValue` returned;
      // on the deferred path the variable was still `undefined` and the
      // probe wrote `JSON.stringify(undefined)` (i.e. the string "undefined")
      // to localStorage. Moving the probe inside the updater eliminates the
      // race: if the updater never runs, neither does the probe.
      mockReadLocalStorageValue.mockReturnValue("v");
      const deferredSetter = vi.fn(() => {
        // Mimic React skipping eager state computation: store the updater
        // for later (or drop it entirely). Either way, the updater MUST NOT
        // fire synchronously inside this mock.
      });
      mockUseLocalStorage.mockReturnValue(["v", deferredSetter, vi.fn()]);
      useFakeLocalStorage(() => {
        // Should never be called — the deferred setter never invokes the
        // updater that owns the probe.
      });

      const { result } = renderHook(() =>
        useLocalDb("test-key", "default", isString)
      );

      result.current[1]("next-value");

      expect(deferredSetter).toHaveBeenCalledTimes(1);
      expect(setItemMock).not.toHaveBeenCalled();
      // Belt-and-braces: even if a future mock change invokes setItem, the
      // wrong-shaped argument we are guarding against is the string
      // "undefined". Make that assertion explicit.
      const calledWithUndefinedString = setItemMock.mock.calls.some(
        (args) => args[1] === "undefined"
      );
      expect(calledWithUndefinedString).toBe(false);
    });

    it("fires onSuccess once when the probe write succeeds", () => {
      const { key } = setupHook();
      const onSuccess = vi.fn();
      useFakeLocalStorage(() => {
        // Pretend success.
      });

      const { result } = renderHook(() => useLocalDb(key, "default", isString));

      result.current[1]("next-value", { onSuccess });

      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it("does not fire onSuccess when the probe write throws", () => {
      const { key } = setupHook();
      const onSuccess = vi.fn();
      const onWriteFailed = vi.fn();
      useFakeLocalStorage(() => {
        throw new DOMException("quota", "QuotaExceededError");
      });

      const { result } = renderHook(() =>
        useLocalDb(key, "default", isString, undefined, onWriteFailed)
      );

      result.current[1]("next-value", { onSuccess });

      expect(onSuccess).not.toHaveBeenCalled();
      expect(onWriteFailed).toHaveBeenCalledTimes(1);
    });

    it("isolates onSuccess exceptions: setter does not throw and onWriteFailed is not invoked", () => {
      // Mirror of the onWriteFailed isolation test for the success path.
      const { key } = setupHook();
      const onSuccess = vi.fn(() => {
        throw new Error("downstream emit threw");
      });
      const onWriteFailed = vi.fn();
      useFakeLocalStorage(() => {
        // Pretend success.
      });

      const { result } = renderHook(() =>
        useLocalDb(key, "default", isString, undefined, onWriteFailed)
      );

      expect(() => result.current[1]("next", { onSuccess })).not.toThrow();
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onWriteFailed).not.toHaveBeenCalled();
    });

    it("fires onSuccess at most once even if the updater runs twice (StrictMode)", () => {
      // React StrictMode invokes setState updaters twice in development to
      // surface impurity. The wrapped setter must dedup outcomes per logical
      // call so onSuccess (which typically emits analytics) doesn't double-fire.
      mockReadLocalStorageValue.mockReturnValue("v");
      const doubleInvokeSetter = vi.fn((next: unknown) => {
        if (typeof next === "function") {
          // `as` justified: see setupHook — generic test mock over `unknown`.
          (next as (prev: unknown) => unknown)("v");
          (next as (prev: unknown) => unknown)("v");
        }
      });
      mockUseLocalStorage.mockReturnValue(["v", doubleInvokeSetter, vi.fn()]);
      const onSuccess = vi.fn();
      useFakeLocalStorage(() => {
        // Pretend success on every call.
      });

      const { result } = renderHook(() =>
        useLocalDb("test-key", "default", isString)
      );

      result.current[1]("next-value", { onSuccess });

      // The updater itself may run twice (setItem may be called twice —
      // that's React's prerogative under StrictMode), but the user-visible
      // outcome callback only fires once per setter invocation.
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });
});
