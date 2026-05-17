import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockReadLocalStorageValue = vi.fn();
const mockUseLocalStorage = vi.fn();
const mockNotifyLocalDbCorruption = vi.fn<(key: string) => void>();
const mockReportLocalDbNotifyFailed =
  vi.fn<(key: string, cause: unknown) => void>();

vi.mock("@mantine/hooks", () => ({
  readLocalStorageValue: (args: unknown) => mockReadLocalStorageValue(args),
  useLocalStorage: (args: unknown) => mockUseLocalStorage(args),
}));

// Mock the telemetry module so cross-tab corruption tests can assert the
// wrapper's notification + analytics calls without exercising real Mantine
// `notifications`, i18next lookups, or GA. `localstorage.ts` only imports
// `notifyLocalDbCorruption` and `reportLocalDbNotifyFailed` from this module,
// so a full replacement is safe.
vi.mock("./localstorage-telemetry", () => ({
  notifyLocalDbCorruption: mockNotifyLocalDbCorruption,
  reportLocalDbNotifyFailed: mockReportLocalDbNotifyFailed,
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

// useLocalDb no longer wraps Mantine's `useLocalStorage`. It reads via
// `useSyncExternalStore` and writes via direct `localStorage.setItem`, so
// these tests drive `window.localStorage` directly and dispatch real DOM
// events to simulate cross-tab and same-tab updates. The
// `mockUseLocalStorage` / `mockReadLocalStorageValue` factories above are
// inert for this block.
//
// happy-dom@20 + vitest@4 in this project's configuration exposes
// `window.localStorage` as a plain `{}` without the Storage API methods, so
// each test installs a hand-rolled mock via `vi.stubGlobal("localStorage", …)`
// backed by an in-memory map. Write-failure tests override the
// `setItemMock` implementation to throw.
describe("useLocalDb", () => {
  let store: Record<string, string>;
  let getItemMock: ReturnType<typeof vi.fn>;
  let setItemMock: ReturnType<typeof vi.fn>;
  let removeItemMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    store = {};
    getItemMock = vi.fn((k: string) => (k in store ? store[k] : null));
    setItemMock = vi.fn((k: string, v: string) => {
      store[k] = String(v);
    });
    removeItemMock = vi.fn((k: string) => {
      delete store[k];
    });
    vi.stubGlobal("localStorage", {
      get length() {
        return Object.keys(store).length;
      },
      getItem: getItemMock,
      setItem: setItemMock,
      removeItem: removeItemMock,
      clear: () => {
        for (const k of Object.keys(store)) {
          delete store[k];
        }
      },
      key: (i: number) => Object.keys(store)[i] ?? null,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  describe("read path", () => {
    it("returns defaultValue when the key is absent", () => {
      const { result } = renderHook(() =>
        useLocalDb("missing", "default", isString)
      );
      expect(result.current[0]).toBe("default");
    });

    it("returns the parsed stored value when validation passes", () => {
      window.localStorage.setItem("k", JSON.stringify("hello"));
      const { result } = renderHook(() => useLocalDb("k", "default", isString));
      expect(result.current[0]).toBe("hello");
    });

    it("returns defaultValue when stored bytes fail the type guard", () => {
      window.localStorage.setItem("k", JSON.stringify(42));
      const { result } = renderHook(() => useLocalDb("k", "default", isString));
      expect(result.current[0]).toBe("default");
    });

    it("returns defaultValue when stored bytes are malformed JSON", () => {
      window.localStorage.setItem("k", "{not valid");
      const { result } = renderHook(() => useLocalDb("k", "default", isString));
      expect(result.current[0]).toBe("default");
    });

    it("returns defaultValue when localStorage.getItem throws (storage-blocked environments)", () => {
      // Simulates Safari ITP / private mode / SecurityError. The wrapper
      // collapses read errors to "absent" — onCorrupt is NOT called from
      // this path (consumers needing the distinction call probeStoredValue
      // directly; see use-stack-limits.ts).
      getItemMock.mockImplementation(() => {
        throw new DOMException("Access denied", "SecurityError");
      });
      const onCorrupt = vi.fn();

      const { result } = renderHook(() =>
        useLocalDb("k", "default", isString, { onCorrupt })
      );

      expect(result.current[0]).toBe("default");
      expect(onCorrupt).not.toHaveBeenCalled();
    });

    it("works with number type", () => {
      window.localStorage.setItem("counter", JSON.stringify(42));
      const { result } = renderHook(() => useLocalDb("counter", 0, isNumber));
      expect(result.current[0]).toBe(42);
    });

    it("works with boolean type", () => {
      window.localStorage.setItem("enabled", JSON.stringify(true));
      const { result } = renderHook(() => useLocalDb("enabled", false, isBool));
      expect(result.current[0]).toBe(true);
    });

    it("works with object type", () => {
      const stored = { name: "test", value: 123 };
      window.localStorage.setItem("settings", JSON.stringify(stored));
      const { result } = renderHook(() =>
        useLocalDb("settings", { name: "", value: 0 }, isTestObj)
      );
      expect(result.current[0]).toEqual(stored);
    });

    it("works with array type", () => {
      window.localStorage.setItem("items", JSON.stringify(["a", "b"]));
      const { result } = renderHook(() =>
        useLocalDb<string[]>("items", [], isStringArray)
      );
      expect(result.current[0]).toEqual(["a", "b"]);
    });
  });

  // Issue #639 regression: Mantine's useLocalStorage used to write the
  // deserialize-fallback (e.g. {}) back to localStorage on mount, silently
  // destroying corrupt-but-recoverable state before any consumer-level
  // corrupt-lock could fire. The new implementation must never write to disk
  // as a side effect of mounting.
  describe("mount-time corrupt blob preservation (issue #639)", () => {
    type Rec = Record<string, number>;
    const isRec = (v: unknown): v is Rec =>
      typeof v === "object" && v !== null && !Array.isArray(v);

    it("does not overwrite a typeguard-failing JSON blob on mount", () => {
      const corrupt = JSON.stringify("garbage-not-a-record");
      window.localStorage.setItem("k", corrupt);

      renderHook(() => useLocalDb<Rec>("k", {}, isRec));

      expect(window.localStorage.getItem("k")).toBe(corrupt);
    });

    it("does not overwrite a malformed JSON blob on mount", () => {
      const garbage = "{not valid json";
      window.localStorage.setItem("k", garbage);

      renderHook(() => useLocalDb("k", "default", isString));

      expect(window.localStorage.getItem("k")).toBe(garbage);
    });

    it("does not write defaultValue to disk when the key is absent", () => {
      renderHook(() => useLocalDb("missing", "default", isString));

      expect(window.localStorage.getItem("missing")).toBeNull();
    });

    it("does not overwrite the corrupt blob across many re-renders", () => {
      const corrupt = JSON.stringify(42);
      window.localStorage.setItem("k", corrupt);

      const { rerender } = renderHook(() =>
        useLocalDb("k", "default", isString)
      );
      for (let i = 0; i < 10; i++) {
        rerender();
      }

      expect(window.localStorage.getItem("k")).toBe(corrupt);
    });
  });

  describe("onCorrupt callback", () => {
    it("does not invoke onCorrupt when the stored value is valid", () => {
      window.localStorage.setItem("k", JSON.stringify("ok"));
      const onCorrupt = vi.fn();

      renderHook(() => useLocalDb("k", "default", isString, { onCorrupt }));

      expect(onCorrupt).not.toHaveBeenCalled();
    });

    it("does not invoke onCorrupt when the stored value is absent", () => {
      const onCorrupt = vi.fn();

      renderHook(() => useLocalDb("k", "default", isString, { onCorrupt }));

      expect(onCorrupt).not.toHaveBeenCalled();
    });

    it("invokes onCorrupt with the parsed value when validation fails", () => {
      window.localStorage.setItem("k", JSON.stringify(123));
      const onCorrupt = vi.fn();

      renderHook(() => useLocalDb("k", "default", isString, { onCorrupt }));

      expect(onCorrupt).toHaveBeenCalledTimes(1);
      expect(onCorrupt).toHaveBeenCalledWith("k", 123);
    });

    it("invokes onCorrupt with the raw bytes on JSON.parse failure", () => {
      const garbage = "{not valid json";
      window.localStorage.setItem("k", garbage);
      const onCorrupt = vi.fn();

      renderHook(() => useLocalDb("k", "default", isString, { onCorrupt }));

      expect(onCorrupt).toHaveBeenCalledTimes(1);
      expect(onCorrupt).toHaveBeenCalledWith("k", garbage);
    });

    it("does not throw when no onCorrupt is provided on a corrupt blob", () => {
      window.localStorage.setItem("k", JSON.stringify(123));

      expect(() =>
        renderHook(() => useLocalDb("k", "default", isString))
      ).not.toThrow();
    });

    it("fires onCorrupt only once across many re-renders for the same corrupt key", () => {
      window.localStorage.setItem("k", JSON.stringify(123));
      const onCorrupt = vi.fn();

      const { rerender } = renderHook(() =>
        useLocalDb("k", "default", isString, { onCorrupt })
      );
      for (let i = 0; i < 20; i++) {
        rerender();
      }

      expect(onCorrupt).toHaveBeenCalledTimes(1);
      expect(onCorrupt).toHaveBeenCalledWith("k", 123);
    });

    it("re-fires onCorrupt when the key changes to another corrupt blob", () => {
      window.localStorage.setItem("key-a", JSON.stringify(1));
      window.localStorage.setItem("key-b", JSON.stringify(2));
      const onCorrupt = vi.fn();

      const { rerender } = renderHook(
        ({ k }: { k: string }) =>
          useLocalDb(k, "default", isString, { onCorrupt }),
        { initialProps: { k: "key-a" } }
      );

      rerender({ k: "key-b" });

      expect(onCorrupt).toHaveBeenCalledTimes(2);
      expect(onCorrupt).toHaveBeenNthCalledWith(1, "key-a", 1);
      expect(onCorrupt).toHaveBeenNthCalledWith(2, "key-b", 2);
    });

    it("invokes onCorrupt with the thrown error when the validator itself throws (read-error branch)", () => {
      // parseRawValue's `try { validate(parsed) } catch` returns
      // { status: "read-error", error } and the corruption effect forwards
      // the thrown error rather than the parsed value.
      window.localStorage.setItem("k", JSON.stringify({ ok: true }));
      const validatorError = new TypeError("validator boom");
      const validateThrows = (_v: unknown): _v is string => {
        throw validatorError;
      };
      const onCorrupt = vi.fn();

      renderHook(() =>
        useLocalDb("k", "default", validateThrows, { onCorrupt })
      );

      expect(onCorrupt).toHaveBeenCalledTimes(1);
      expect(onCorrupt).toHaveBeenCalledWith("k", validatorError);
    });
  });

  describe("setter (probedSetValue)", () => {
    it("writes the JSON-serialized value to localStorage", () => {
      const { result } = renderHook(() => useLocalDb("k", "default", isString));

      result.current[1]("next-value");

      expect(window.localStorage.getItem("k")).toBe(
        JSON.stringify("next-value")
      );
    });

    it("supports function-updater form with prev = current parsed value", () => {
      window.localStorage.setItem("counter", JSON.stringify(10));
      const { result } = renderHook(() =>
        useLocalDb<number>("counter", 0, isNumber)
      );

      result.current[1]((prev) => prev + 5);

      expect(window.localStorage.getItem("counter")).toBe(JSON.stringify(15));
    });

    it("function-updater receives defaultValue when the key is absent", () => {
      const { result } = renderHook(() =>
        useLocalDb<number>("counter", 7, isNumber)
      );

      result.current[1]((prev) => prev * 2);

      expect(window.localStorage.getItem("counter")).toBe(JSON.stringify(14));
    });

    it("dispatches a same-tab CustomEvent on a successful write", () => {
      const listener = vi.fn<(event: Event) => void>();
      window.addEventListener("memdeck-localstorage", listener);
      try {
        const { result } = renderHook(() =>
          useLocalDb("k", "default", isString)
        );

        result.current[1]("next");

        expect(listener).toHaveBeenCalledTimes(1);
        const event = listener.mock.calls[0]?.[0];
        if (!(event instanceof CustomEvent)) {
          throw new Error(
            "expected memdeck-localstorage event to be a CustomEvent"
          );
        }
        expect(event.detail).toEqual({ key: "k" });
      } finally {
        window.removeEventListener("memdeck-localstorage", listener);
      }
    });

    it("returns a stable setter reference across re-renders for the same key", () => {
      const { result, rerender } = renderHook(() =>
        useLocalDb("k", "default", isString)
      );
      const initial = result.current[1];

      rerender();
      rerender();

      expect(result.current[1]).toBe(initial);
    });

    it("returns a new setter when the key changes", () => {
      const { result, rerender } = renderHook(
        ({ k }: { k: string }) => useLocalDb(k, "default", isString),
        { initialProps: { k: "a" } }
      );
      const initial = result.current[1];

      rerender({ k: "b" });

      expect(result.current[1]).not.toBe(initial);
    });

    // Pins the dispatchKeyChange throw-isolation contract: setItem succeeds
    // but a synchronous listener throws → onSuccess fires, onWriteFailed
    // does NOT fire, value is on disk. A future refactor that re-folds
    // dispatch into the outer try/catch would silently regress to false
    // write-failure toasts and a stuck dedup latch.
    it("fires onSuccess (not onWriteFailed) when a same-tab listener throws after a successful write", () => {
      const onSuccess = vi.fn();
      const onWriteFailed = vi.fn();
      const throwingListener = (): void => {
        throw new Error("listener boom");
      };
      window.addEventListener("memdeck-localstorage", throwingListener);
      try {
        const { result } = renderHook(() =>
          useLocalDb("k", "default", isString, { onWriteFailed })
        );

        expect(() =>
          result.current[1]("next-value", { onSuccess })
        ).not.toThrow();

        expect(window.localStorage.getItem("k")).toBe(
          JSON.stringify("next-value")
        );
        expect(onSuccess).toHaveBeenCalledTimes(1);
        expect(onWriteFailed).not.toHaveBeenCalled();
      } finally {
        window.removeEventListener("memdeck-localstorage", throwingListener);
      }
    });
  });

  // Pins the safeJsonReviver prototype-pollution defense. The reviver strips
  // `__proto__` / `constructor` / `prototype` keys at JSON.parse time so a
  // tampered blob cannot pollute the prototype chain when a downstream
  // consumer spreads the parsed value (`{ ...parsed }`). Without these
  // tests, a future refactor that drops the reviver argument from
  // JSON.parse, shortens the key list, or "simplifies" the function would
  // silently re-open the prototype-pollution surface — every behavioral
  // test still passes because the parsed VALUE is structurally fine; only
  // the prototype chain is poisoned.
  describe("safeJsonReviver / prototype pollution", () => {
    type Bag = Record<string, unknown>;
    const isBag = (value: unknown): value is Bag =>
      typeof value === "object" && value !== null && !Array.isArray(value);

    it("strips a top-level `__proto__` key without polluting Object.prototype", () => {
      window.localStorage.setItem(
        "k",
        '{"__proto__":{"polluted":"yes"},"a":1}'
      );

      const { result } = renderHook(() => useLocalDb<Bag>("k", {}, isBag));
      const parsed = result.current[0];

      // Use Object.keys (own enumerable keys) — `in` walks the prototype
      // chain and would mask a successful pollution.
      expect(Object.keys(parsed)).not.toContain("polluted");
      expect((parsed as Bag).polluted).toBeUndefined();
      expect(parsed.a).toBe(1);
      // The smoking-gun assertion: a brand-new {} must NOT have `polluted`
      // anywhere in its prototype chain.
      expect(({} as Bag).polluted).toBeUndefined();
    });

    it("strips a nested `__proto__` key", () => {
      window.localStorage.setItem(
        "k",
        '{"a":{"__proto__":{"polluted":"yes"},"b":2}}'
      );

      const { result } = renderHook(() => useLocalDb<Bag>("k", {}, isBag));
      const parsed = result.current[0];
      const inner = parsed.a as Bag;

      expect(Object.keys(inner)).not.toContain("polluted");
      expect((inner as Bag).polluted).toBeUndefined();
      expect(inner.b).toBe(2);
      expect(({} as Bag).polluted).toBeUndefined();
    });

    it("strips `constructor` and `prototype` keys at any depth", () => {
      window.localStorage.setItem(
        "k",
        '{"constructor":{"prototype":{"polluted":"yes"}},"prototype":"top","x":42}'
      );

      const { result } = renderHook(() => useLocalDb<Bag>("k", {}, isBag));
      const parsed = result.current[0];

      // Object.keys returns own enumerable keys — `"constructor" in parsed`
      // would return true because of the inherited Object.prototype.constructor,
      // but the reviver only strips own properties.
      const ownKeys = Object.keys(parsed);
      expect(ownKeys).not.toContain("constructor");
      expect(ownKeys).not.toContain("prototype");
      expect(parsed.x).toBe(42);
      expect(({} as Bag).polluted).toBeUndefined();
    });

    it("preserves array elements (integer keys never match the strip list)", () => {
      window.localStorage.setItem("items", JSON.stringify([1, 2, 3]));

      const { result } = renderHook(() =>
        useLocalDb<number[]>("items", [], isNumberArray)
      );

      expect(result.current[0]).toEqual([1, 2, 3]);
    });
  });

  // Reset-on-write is the documented corruption-recovery path for low-stakes
  // single-value consumers (see use-selected-stack.ts:34-37). Multi-record
  // consumers like useStackLimits gate the setter at the consumer level.
  // The wrapper itself must NOT block writes when storage is corrupt — that
  // would trap users in an unrecoverable state for stack/timer/etc.
  describe("setter overwrites a corrupt blob (reset-on-write)", () => {
    it("overwrites a typeguard-failing blob when the consumer calls the setter", () => {
      window.localStorage.setItem("k", JSON.stringify(42));
      const { result } = renderHook(() => useLocalDb("k", "default", isString));

      result.current[1]("recovered");

      expect(window.localStorage.getItem("k")).toBe(
        JSON.stringify("recovered")
      );
    });

    it("overwrites an unparseable blob when the consumer calls the setter", () => {
      window.localStorage.setItem("k", "{not valid");
      const { result } = renderHook(() => useLocalDb("k", "default", isString));

      result.current[1]("recovered");

      expect(window.localStorage.getItem("k")).toBe(
        JSON.stringify("recovered")
      );
    });

    it("function-updater receives defaultValue (not the corrupt parsed value) when the on-disk blob is corrupt", () => {
      window.localStorage.setItem("counter", JSON.stringify("not a number"));
      const { result } = renderHook(() =>
        useLocalDb<number>("counter", 7, isNumber)
      );

      result.current[1]((prev) => prev + 1);

      expect(window.localStorage.getItem("counter")).toBe(JSON.stringify(8));
    });
  });

  describe("removeValue", () => {
    it("removes the key from localStorage", () => {
      window.localStorage.setItem("k", JSON.stringify("v"));
      const { result } = renderHook(() => useLocalDb("k", "default", isString));

      result.current[2]();

      expect(window.localStorage.getItem("k")).toBeNull();
    });

    it("dispatches the same-tab CustomEvent so peer subscribers re-read", () => {
      window.localStorage.setItem("k", JSON.stringify("v"));
      const listener = vi.fn<(event: Event) => void>();
      window.addEventListener("memdeck-localstorage", listener);
      try {
        const { result } = renderHook(() =>
          useLocalDb("k", "default", isString)
        );

        result.current[2]();

        expect(listener).toHaveBeenCalledTimes(1);
        const event = listener.mock.calls[0]?.[0];
        if (!(event instanceof CustomEvent)) {
          throw new Error(
            "expected memdeck-localstorage event to be a CustomEvent"
          );
        }
        expect(event.detail).toEqual({ key: "k" });
      } finally {
        window.removeEventListener("memdeck-localstorage", listener);
      }
    });

    it("does not throw when removeItem itself throws", () => {
      window.localStorage.setItem("k", JSON.stringify("v"));
      removeItemMock.mockImplementation(() => {
        throw new DOMException("removeItem blocked", "SecurityError");
      });
      const { result } = renderHook(() => useLocalDb("k", "default", isString));

      expect(() => result.current[2]()).not.toThrow();
    });
  });

  describe("reactivity", () => {
    it("updates same-tab peer subscribers when one consumer writes", () => {
      const { result } = renderHook(() => ({
        a: useLocalDb("k", "default", isString),
        b: useLocalDb("k", "default", isString),
      }));

      expect(result.current.a[0]).toBe("default");
      expect(result.current.b[0]).toBe("default");

      act(() => {
        result.current.a[1]("hello");
      });

      expect(result.current.a[0]).toBe("hello");
      expect(result.current.b[0]).toBe("hello");
    });

    it("updates on a cross-tab `storage` event", () => {
      const { result } = renderHook(() => useLocalDb("k", "default", isString));
      expect(result.current[0]).toBe("default");

      act(() => {
        window.localStorage.setItem("k", JSON.stringify("from-other-tab"));
        // happy-dom doesn't fire `storage` for the writing tab; dispatching
        // manually simulates the cross-tab notification.
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: "k",
            newValue: JSON.stringify("from-other-tab"),
            storageArea: window.localStorage,
          })
        );
      });

      expect(result.current[0]).toBe("from-other-tab");
    });

    it("falls back to defaultValue when storage.clear() arrives via storage event (key === null)", () => {
      window.localStorage.setItem("k", JSON.stringify("hello"));
      const { result } = renderHook(() => useLocalDb("k", "default", isString));
      expect(result.current[0]).toBe("hello");

      act(() => {
        window.localStorage.removeItem("k");
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: null,
            newValue: null,
            storageArea: window.localStorage,
          })
        );
      });

      expect(result.current[0]).toBe("default");
    });
  });

  // Issue #628 regression: when a cross-tab `storage` event delivers a value
  // that fails JSON.parse / validate, the wrapper used to roll the rendered
  // `value` (and the setter's `prev`) back to `defaultValue`, silently
  // discarding the user's in-flight edits. The fix tracks the last-known-
  // valid value in a ref and prefers it on corrupt/read-error probes.
  describe("cross-tab corruption preserves in-memory state (issue #628)", () => {
    type Rec = { a: number; b: number };
    const isRec = (value: unknown): value is Rec =>
      typeof value === "object" &&
      value !== null &&
      "a" in value &&
      "b" in value &&
      typeof value.a === "number" &&
      typeof value.b === "number";

    const fireCrossTabRaw = (key: string, bytes: string): void => {
      window.localStorage.setItem(key, bytes);
      window.dispatchEvent(
        new StorageEvent("storage", {
          key,
          newValue: bytes,
          storageArea: window.localStorage,
        })
      );
    };

    beforeEach(() => {
      mockNotifyLocalDbCorruption.mockClear();
      mockReportLocalDbNotifyFailed.mockClear();
    });

    it("preserves the in-memory value across a cross-tab corrupt write (read side)", () => {
      window.localStorage.setItem("k", JSON.stringify("user-edit"));
      const { result } = renderHook(() => useLocalDb("k", "default", isString));
      expect(result.current[0]).toBe("user-edit");

      act(() => {
        fireCrossTabRaw("k", "{not valid json");
      });

      // Without the rollback fix this would be "default"; with it the user's
      // last-known-valid in-memory state survives.
      expect(result.current[0]).toBe("user-edit");
    });

    it("preserves in-memory state for a functional setter's `prev` after cross-tab corruption (write side)", () => {
      const initial: Rec = { a: 1, b: 2 };
      window.localStorage.setItem("rec", JSON.stringify(initial));

      const { result } = renderHook(() =>
        useLocalDb<Rec>("rec", { a: 0, b: 0 }, isRec)
      );

      act(() => {
        fireCrossTabRaw("rec", "{not valid json");
      });

      act(() => {
        result.current[1]((prev) => ({ ...prev, a: 99 }));
      });

      // Without the write-side fix `prev` would be the defaultValue
      // { a: 0, b: 0 } and the persisted blob would be { a: 99, b: 0 } —
      // silently dropping the user's `b: 2`. The fix uses the last valid
      // in-memory state as `prev`, so `b: 2` survives.
      const persisted: unknown = JSON.parse(
        window.localStorage.getItem("rec") ?? "null"
      );
      expect(persisted).toEqual({ a: 99, b: 2 });
    });

    it("does not toast on a mount-time corrupt blob", () => {
      window.localStorage.setItem("k", "{not valid json");

      renderHook(() => useLocalDb("k", "default", isString));

      expect(mockNotifyLocalDbCorruption).not.toHaveBeenCalled();
    });

    it("toasts once on a valid→corrupt cross-tab transition", () => {
      window.localStorage.setItem("k", JSON.stringify("ok"));
      renderHook(() => useLocalDb("k", "default", isString));

      expect(mockNotifyLocalDbCorruption).not.toHaveBeenCalled();

      act(() => {
        fireCrossTabRaw("k", "{not valid json");
      });

      expect(mockNotifyLocalDbCorruption).toHaveBeenCalledTimes(1);
      expect(mockNotifyLocalDbCorruption).toHaveBeenCalledWith("k");
    });

    it("does not re-toast on consecutive corrupt events without an intervening valid", () => {
      window.localStorage.setItem("k", JSON.stringify("ok"));
      renderHook(() => useLocalDb("k", "default", isString));

      act(() => {
        fireCrossTabRaw("k", "{bad-1");
      });
      act(() => {
        fireCrossTabRaw("k", "{bad-2");
      });
      act(() => {
        fireCrossTabRaw("k", "{bad-3");
      });

      expect(mockNotifyLocalDbCorruption).toHaveBeenCalledTimes(1);
    });

    it("re-toasts after a corrupt→valid→corrupt sequence", () => {
      window.localStorage.setItem("k", JSON.stringify("ok"));
      renderHook(() => useLocalDb("k", "default", isString));

      act(() => {
        fireCrossTabRaw("k", "{bad-1");
      });
      expect(mockNotifyLocalDbCorruption).toHaveBeenCalledTimes(1);

      act(() => {
        fireCrossTabRaw("k", JSON.stringify("recovered"));
      });
      expect(mockNotifyLocalDbCorruption).toHaveBeenCalledTimes(1);

      act(() => {
        fireCrossTabRaw("k", "{bad-2");
      });
      expect(mockNotifyLocalDbCorruption).toHaveBeenCalledTimes(2);
    });

    it("does not toast on an absent→corrupt sequence (cross-tab clear() then cross-tab corrupt write)", () => {
      // After an `absent` probe (cross-tab clear), `wasValidRef` is reset to
      // false, so the subsequent corrupt probe is treated as mount-like
      // rather than a valid→corrupt transition. Pins the invariant: a
      // future refactor that flipped `wasValidRef` to true on `absent`
      // would start firing phantom toasts on clear-then-corrupt sequences.
      window.localStorage.setItem("k", JSON.stringify("ok"));
      renderHook(() => useLocalDb("k", "default", isString));

      act(() => {
        window.localStorage.removeItem("k");
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: null,
            newValue: null,
            storageArea: window.localStorage,
          })
        );
      });
      expect(mockNotifyLocalDbCorruption).not.toHaveBeenCalled();

      act(() => {
        fireCrossTabRaw("k", "{not valid json");
      });
      expect(mockNotifyLocalDbCorruption).not.toHaveBeenCalled();
    });

    it("does not toast on a cross-tab `clear()` (absent), and falls back to defaultValue", () => {
      window.localStorage.setItem("k", JSON.stringify("user-edit"));
      const { result } = renderHook(() => useLocalDb("k", "default", isString));
      expect(result.current[0]).toBe("user-edit");

      act(() => {
        window.localStorage.removeItem("k");
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: null,
            newValue: null,
            storageArea: window.localStorage,
          })
        );
      });

      // `absent` keeps current semantics: a deliberate cross-tab clear is
      // not corruption, so the value falls back to defaultValue and no
      // toast fires.
      expect(result.current[0]).toBe("default");
      expect(mockNotifyLocalDbCorruption).not.toHaveBeenCalled();
    });

    it("still invokes `onCorrupt` on the valid→corrupt transition (telemetry semantics preserved)", () => {
      window.localStorage.setItem("k", JSON.stringify("ok"));
      const onCorrupt = vi.fn();
      renderHook(() => useLocalDb("k", "default", isString, { onCorrupt }));
      expect(onCorrupt).not.toHaveBeenCalled();

      act(() => {
        fireCrossTabRaw("k", "{bad");
      });

      expect(onCorrupt).toHaveBeenCalledTimes(1);
      expect(onCorrupt).toHaveBeenCalledWith("k", "{bad");
    });

    it("does not surface the previous key's last-known-valid value when `key` changes to a corrupt blob (read side)", () => {
      window.localStorage.setItem("key-a", JSON.stringify("from-a"));
      window.localStorage.setItem("key-b", "{not valid json");

      const { result, rerender } = renderHook(
        ({ k }: { k: string }) => useLocalDb(k, "default", isString),
        { initialProps: { k: "key-a" } }
      );
      expect(result.current[0]).toBe("from-a");

      rerender({ k: "key-b" });

      // Without the per-key guard, latestValidRef would still carry
      // "from-a" and the corrupt key-b would surface it as if it were a
      // valid key-b value. With the guard, the consumer sees `defaultValue`.
      expect(result.current[0]).toBe("default");
    });

    it("does not fire the toast when `key` changes from a valid blob to a key whose blob is corrupt", () => {
      window.localStorage.setItem("key-a", JSON.stringify("from-a"));
      window.localStorage.setItem("key-b", "{not valid json");

      const { rerender } = renderHook(
        ({ k }: { k: string }) => useLocalDb(k, "default", isString),
        { initialProps: { k: "key-a" } }
      );
      expect(mockNotifyLocalDbCorruption).not.toHaveBeenCalled();

      rerender({ k: "key-b" });

      // A `key` swap is not a valid→corrupt transition for the new key —
      // the new key's first probe is mount-time corruption from its
      // perspective, which is documented to stay silent.
      expect(mockNotifyLocalDbCorruption).not.toHaveBeenCalled();
    });

    it("does not feed the previous key's last-known-valid value to a functional setter when the new key's blob is corrupt", () => {
      const initial: Rec = { a: 1, b: 2 };
      window.localStorage.setItem("key-a", JSON.stringify(initial));
      window.localStorage.setItem("key-b", "{not valid json");

      const { result, rerender } = renderHook(
        ({ k }: { k: string }) => useLocalDb<Rec>(k, { a: 0, b: 0 }, isRec),
        { initialProps: { k: "key-a" } }
      );

      rerender({ k: "key-b" });

      act(() => {
        result.current[1]((prev) => ({ ...prev, a: 99 }));
      });

      const persisted: unknown = JSON.parse(
        window.localStorage.getItem("key-b") ?? "null"
      );
      // Without the per-key guard, `prev` would be { a: 1, b: 2 } from
      // key-a and the persisted record would mix keys. With the guard,
      // `prev` falls back to the consumer's `defaultValue`.
      expect(persisted).toEqual({ a: 99, b: 0 });
    });

    it("preserves the in-memory value across a cross-tab read-error event (validator throws)", () => {
      window.localStorage.setItem("k", JSON.stringify("user-edit"));
      const validatorError = new TypeError("validator boom");
      let throwOnNext = false;
      // Validator throws ONLY on the cross-tab post-image so the initial
      // mount produces a valid probe (otherwise latestValidRef never
      // populates and the test only exercises the mount-time-corrupt path).
      const validateMaybeThrows = (value: unknown): value is string => {
        if (throwOnNext) {
          throw validatorError;
        }
        return typeof value === "string";
      };

      const { result } = renderHook(() =>
        useLocalDb("k", "default", validateMaybeThrows)
      );
      expect(result.current[0]).toBe("user-edit");

      throwOnNext = true;
      act(() => {
        fireCrossTabRaw("k", JSON.stringify("post-image"));
      });

      // Read-error branch must preserve in-memory state, not roll back to
      // `defaultValue`.
      expect(result.current[0]).toBe("user-edit");
    });

    it("toasts on a valid→read-error cross-tab transition (validator throws)", () => {
      window.localStorage.setItem("k", JSON.stringify("user-edit"));
      let throwOnNext = false;
      const validateMaybeThrows = (value: unknown): value is string => {
        if (throwOnNext) {
          throw new TypeError("validator boom");
        }
        return typeof value === "string";
      };

      renderHook(() => useLocalDb("k", "default", validateMaybeThrows));
      expect(mockNotifyLocalDbCorruption).not.toHaveBeenCalled();

      throwOnNext = true;
      act(() => {
        fireCrossTabRaw("k", JSON.stringify("post-image"));
      });

      expect(mockNotifyLocalDbCorruption).toHaveBeenCalledTimes(1);
      expect(mockNotifyLocalDbCorruption).toHaveBeenCalledWith("k");
    });

    it("uses the latest in-memory value as `prev` for a functional setter when the setter's own re-read hits read-error", () => {
      const initial: Rec = { a: 1, b: 2 };
      window.localStorage.setItem("rec", JSON.stringify(initial));
      let throwOnNext = false;
      const validateMaybeThrows = (value: unknown): value is Rec => {
        if (throwOnNext) {
          throw new TypeError("validator boom");
        }
        return isRec(value);
      };

      const { result } = renderHook(() =>
        useLocalDb<Rec>("rec", { a: 0, b: 0 }, validateMaybeThrows)
      );

      throwOnNext = true;
      act(() => {
        fireCrossTabRaw("rec", JSON.stringify({ a: "tampered" }));
      });

      // Keep `throwOnNext = true` through the setter so the setter's own
      // `parseRawValue(readRawValue(key), validate)` re-read hits the
      // read-error branch (validate throws) — NOT the corrupt branch
      // (validate returns false). Without this discipline, a regression
      // that dropped `read-error` from the setter's else-if would survive
      // the suite. The read-error throw is caught inside `parseRawValue`
      // and surfaces as `currentProbe.status === "read-error"`.
      act(() => {
        result.current[1]((prev) => ({ ...prev, a: 99 }));
      });

      const persisted: unknown = JSON.parse(
        window.localStorage.getItem("rec") ?? "null"
      );
      expect(persisted).toEqual({ a: 99, b: 2 });
    });

    it("re-fires the toast on corrupt→valid→corrupt while `onCorrupt` stays once (asymmetry pin)", () => {
      window.localStorage.setItem("k", JSON.stringify("ok"));
      const onCorrupt = vi.fn();
      renderHook(() => useLocalDb("k", "default", isString, { onCorrupt }));

      act(() => {
        fireCrossTabRaw("k", "{bad-1");
      });
      expect(mockNotifyLocalDbCorruption).toHaveBeenCalledTimes(1);
      expect(onCorrupt).toHaveBeenCalledTimes(1);

      act(() => {
        fireCrossTabRaw("k", JSON.stringify("recovered"));
      });

      act(() => {
        fireCrossTabRaw("k", "{bad-2");
      });

      // Toast fires every fresh transition (UI signal must track each
      // drift). `onCorrupt` is once-per-mount-key by design — telemetry
      // intentionally does not repeat for the same session.
      expect(mockNotifyLocalDbCorruption).toHaveBeenCalledTimes(2);
      expect(onCorrupt).toHaveBeenCalledTimes(1);
    });

    it("does not pollute `latestValidRef` with corrupt-probe data (valid → corrupt → valid')", () => {
      // Cache-purity invariant: only `valid` probes may update
      // `latestValidRef`. A regression where a corrupt probe overwrote the
      // cache (e.g. with `{ has: true, value: probe.raw }`) would not be
      // caught by the existing valid→corrupt tests because they assert the
      // pre-corruption value. This test pins the invariant by interposing a
      // valid' (different) value AFTER the corrupt event and asserting the
      // in-memory state reflects valid', not the corrupt blob's parsed-but-
      // invalid form.
      window.localStorage.setItem("k", JSON.stringify("first-valid"));
      const { result } = renderHook(() => useLocalDb("k", "default", isString));
      expect(result.current[0]).toBe("first-valid");

      act(() => {
        fireCrossTabRaw("k", "{not valid json");
      });
      // Corrupt probe must not have overwritten the cache.
      expect(result.current[0]).toBe("first-valid");

      act(() => {
        fireCrossTabRaw("k", JSON.stringify("second-valid"));
      });
      // After a fresh valid probe, the cache must update — and any
      // subsequent corrupt event must fall back to `second-valid`, not
      // `first-valid` (which would indicate the corrupt probe had silently
      // pinned the cache to the wrong slot).
      expect(result.current[0]).toBe("second-valid");

      act(() => {
        fireCrossTabRaw("k", "{another corrupt blob");
      });
      expect(result.current[0]).toBe("second-valid");
    });

    it("uses the most recent setter-written value (not the mount-time value) as `latestValid` after multiple writes", () => {
      const initial: Rec = { a: 1, b: 2 };
      window.localStorage.setItem("rec", JSON.stringify(initial));

      const { result } = renderHook(() =>
        useLocalDb<Rec>("rec", { a: 0, b: 0 }, isRec)
      );

      // Several user-driven valid writes after mount — `latestValidRef`
      // must track the most recent, not the mount-time blob.
      act(() => {
        result.current[1]({ a: 10, b: 20 });
      });
      act(() => {
        result.current[1]({ a: 100, b: 200 });
      });

      act(() => {
        fireCrossTabRaw("rec", "{not valid json");
      });

      act(() => {
        result.current[1]((prev) => ({ ...prev, a: 999 }));
      });

      const persisted: unknown = JSON.parse(
        window.localStorage.getItem("rec") ?? "null"
      );
      // `prev` must be the LAST setter-written record, not the mount-time
      // one — otherwise post-mount edits silently disappear under
      // cross-tab corruption.
      expect(persisted).toEqual({ a: 999, b: 200 });
    });

    it("preserves both peer subscribers' in-memory values when a cross-tab corrupt event fires", () => {
      window.localStorage.setItem("k", JSON.stringify("seed"));

      const { result } = renderHook(() => ({
        a: useLocalDb("k", "default", isString),
        b: useLocalDb("k", "default", isString),
      }));
      expect(result.current.a[0]).toBe("seed");
      expect(result.current.b[0]).toBe("seed");

      act(() => {
        fireCrossTabRaw("k", "{not valid json");
      });

      // Each instance has its own `latestValidRef` — both should
      // independently keep the last-known-valid value.
      expect(result.current.a[0]).toBe("seed");
      expect(result.current.b[0]).toBe("seed");
      // Each instance fires its own toast call; Mantine's `id` field on
      // the notification is what dedups at the UI layer (out of scope
      // here). Pin the per-instance call-count contract.
      expect(mockNotifyLocalDbCorruption).toHaveBeenCalledTimes(2);
    });

    it('does not toast on a cross-tab targeted removal (`event.key === "k"`, `newValue === null`)', () => {
      window.localStorage.setItem("k", JSON.stringify("user-edit"));
      const { result } = renderHook(() => useLocalDb("k", "default", isString));
      expect(result.current[0]).toBe("user-edit");

      act(() => {
        window.localStorage.removeItem("k");
        // Cross-tab targeted removal arrives with the specific key and a
        // null newValue — distinct from `event.key === null` which fires
        // on `localStorage.clear()`. Both must collapse to `absent` and
        // stay silent on the toast surface.
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: "k",
            newValue: null,
            storageArea: window.localStorage,
          })
        );
      });

      expect(result.current[0]).toBe("default");
      expect(mockNotifyLocalDbCorruption).not.toHaveBeenCalled();
    });

    it("clears `wasValid` BEFORE invoking `notifyLocalDbCorruption` so a throw doesn't pin re-toast on every subsequent probe", () => {
      // Pins the ordering invariant in the toast effect: the ref must be
      // assigned before the call, otherwise a throw inside
      // `notifyLocalDbCorruption` (e.g. notifications provider not mounted
      // during prerender or pre-i18n init) leaves `wasValidRef` true and
      // causes every subsequent probe to re-attempt the toast.
      // Suppress the catch block's DEV-only console.warn so the test output
      // stays quiet — match the suppression pattern used elsewhere in this
      // file for intentional throw paths.
      const consoleWarnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {
          // Intentionally swallow the dev-only warn from the wrapper's catch.
        });
      try {
        mockNotifyLocalDbCorruption.mockImplementationOnce(() => {
          throw new Error("notifications provider not mounted");
        });
        window.localStorage.setItem("k", JSON.stringify("ok"));
        renderHook(() => useLocalDb("k", "default", isString));

        act(() => {
          fireCrossTabRaw("k", "{bad-1");
        });
        // First fire: throws inside the call. With the ordering fix,
        // `wasValidRef` was already cleared to `{ wasValid: false }` before
        // the throw. Without the fix, it would still be true.
        expect(mockNotifyLocalDbCorruption).toHaveBeenCalledTimes(1);

        act(() => {
          fireCrossTabRaw("k", "{bad-2");
        });
        // Second fire (different bytes → fresh probe → effect re-runs).
        // With the ordering fix: wasValid=false → no toast call (count stays 1).
        // Without the fix: wasValid still true (mock no longer throws this
        // time) → toast call → count would be 2.
        expect(mockNotifyLocalDbCorruption).toHaveBeenCalledTimes(1);
        // Telemetry breadcrumb pinned: the catch block must report the
        // toast-pipeline failure to analytics so a regressed Mantine
        // provider doesn't silently disable corruption toasts in production.
        expect(mockReportLocalDbNotifyFailed).toHaveBeenCalledTimes(1);
        expect(mockReportLocalDbNotifyFailed).toHaveBeenCalledWith(
          "k",
          expect.any(Error)
        );
      } finally {
        consoleWarnSpy.mockRestore();
      }
    });

    it("does not fire the toast when `key` changes to a key whose blob triggers a read-error (validator throws)", () => {
      // Symmetric to the corrupt-branch key-swap test above. Pins the
      // per-key guard's read-error variant.
      let throwForKey: string | null = null;
      const validateMaybeThrows = (value: unknown): value is string => {
        if (throwForKey !== null) {
          throw new TypeError("validator boom");
        }
        return typeof value === "string";
      };

      window.localStorage.setItem("key-a", JSON.stringify("from-a"));
      window.localStorage.setItem("key-b", JSON.stringify("from-b"));

      const { rerender } = renderHook(
        ({ k }: { k: string }) => useLocalDb(k, "default", validateMaybeThrows),
        { initialProps: { k: "key-a" } }
      );
      expect(mockNotifyLocalDbCorruption).not.toHaveBeenCalled();

      throwForKey = "key-b";
      rerender({ k: "key-b" });

      // First probe of key-b is read-error (validator throws). The per-key
      // guard rejects the stale `wasValidRef.current.key === "key-a"`, so
      // this looks like mount-time corruption for key-b, not a transition.
      expect(mockNotifyLocalDbCorruption).not.toHaveBeenCalled();
    });

    it("preserves each peer subscriber's last-known-valid value independently when one peer wrote fresh state before a cross-tab corrupt event", () => {
      window.localStorage.setItem("k", JSON.stringify("seed"));

      const { result } = renderHook(() => ({
        a: useLocalDb("k", "default", isString),
        b: useLocalDb("k", "default", isString),
      }));

      // Peer A writes a fresh value via the setter; the same-tab custom
      // event propagates to peer B, so both update their own
      // `latestValidRef` to "fresh-from-a".
      act(() => {
        result.current.a[1]("fresh-from-a");
      });
      expect(result.current.a[0]).toBe("fresh-from-a");
      expect(result.current.b[0]).toBe("fresh-from-a");

      // Cross-tab corrupt event arrives — both peers' in-memory state
      // must hold the post-write value, not the seed and not the default.
      act(() => {
        fireCrossTabRaw("k", "{not valid json");
      });

      expect(result.current.a[0]).toBe("fresh-from-a");
      expect(result.current.b[0]).toBe("fresh-from-a");
    });
  });

  describe("write failures", () => {
    // The outer beforeEach already stubs window.localStorage and exposes
    // setItemMock. These tests just override its implementation to throw.
    const quotaError = (): DOMException =>
      new DOMException("quota", "QuotaExceededError");

    it("forwards quota errors to onWriteFailed", () => {
      const onWriteFailed = vi.fn();
      const err = quotaError();
      setItemMock.mockImplementation(() => {
        throw err;
      });

      const { result } = renderHook(() =>
        useLocalDb("k", "default", isString, { onWriteFailed })
      );

      result.current[1]("next");

      expect(onWriteFailed).toHaveBeenCalledTimes(1);
      expect(onWriteFailed).toHaveBeenCalledWith("k", err);
    });

    it("dedup: fires onWriteFailed once across consecutive failures for the same key", () => {
      const onWriteFailed = vi.fn();
      setItemMock.mockImplementation(() => {
        throw quotaError();
      });

      const { result } = renderHook(() =>
        useLocalDb("k", "default", isString, { onWriteFailed })
      );

      result.current[1]("a");
      result.current[1]("b");
      result.current[1]("c");

      expect(onWriteFailed).toHaveBeenCalledTimes(1);
      expect(setItemMock).toHaveBeenCalledTimes(3);
    });

    it("re-fires after a successful write resets the streak", () => {
      const onWriteFailed = vi.fn();
      setItemMock
        .mockImplementationOnce(() => {
          throw quotaError();
        })
        .mockImplementationOnce(() => {
          // Pretend the second write succeeded — should reset the dedup latch.
        })
        .mockImplementationOnce(() => {
          throw quotaError();
        });

      const { result } = renderHook(() =>
        useLocalDb("k", "default", isString, { onWriteFailed })
      );

      result.current[1]("a");
      result.current[1]("b");
      result.current[1]("c");

      expect(onWriteFailed).toHaveBeenCalledTimes(2);
    });

    it("dedup resets when the key changes", () => {
      const onWriteFailed = vi.fn();
      setItemMock.mockImplementation(() => {
        throw quotaError();
      });

      const { result, rerender } = renderHook(
        ({ k }: { k: string }) =>
          useLocalDb(k, "default", isString, { onWriteFailed }),
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

    it("does not throw when no onWriteFailed callback is provided", () => {
      setItemMock.mockImplementation(() => {
        throw quotaError();
      });

      const { result } = renderHook(() => useLocalDb("k", "default", isString));

      expect(() => result.current[1]("next")).not.toThrow();
      expect(() => result.current[1]("again")).not.toThrow();
    });

    it("isolates onWriteFailed exceptions: setter does not throw and dedup latch is still set", () => {
      // Realistic failure mode: notifications.show could throw if the
      // provider isn't mounted yet. The wrapped setter must swallow the
      // callback exception so the consumer's UI handler doesn't crash, AND
      // the dedup latch must still register so a second failure doesn't
      // re-fire telemetry on every render.
      const onWriteFailed = vi.fn(() => {
        throw new Error("notifications provider not mounted");
      });
      setItemMock.mockImplementation(() => {
        throw quotaError();
      });

      const { result } = renderHook(() =>
        useLocalDb("k", "default", isString, { onWriteFailed })
      );

      expect(() => result.current[1]("next")).not.toThrow();
      expect(() => result.current[1]("again")).not.toThrow();

      expect(onWriteFailed).toHaveBeenCalledTimes(1);
    });

    it("does not fire onSuccess when the write throws", () => {
      const onSuccess = vi.fn();
      const onWriteFailed = vi.fn();
      setItemMock.mockImplementation(() => {
        throw quotaError();
      });

      const { result } = renderHook(() =>
        useLocalDb("k", "default", isString, { onWriteFailed })
      );

      result.current[1]("next", { onSuccess });

      expect(onSuccess).not.toHaveBeenCalled();
      expect(onWriteFailed).toHaveBeenCalledTimes(1);
    });

    it("isolates onSuccess exceptions: setter does not throw and onWriteFailed is not invoked", () => {
      const onSuccess = vi.fn(() => {
        throw new Error("downstream emit threw");
      });
      const onWriteFailed = vi.fn();

      const { result } = renderHook(() =>
        useLocalDb("k", "default", isString, { onWriteFailed })
      );

      expect(() => result.current[1]("next", { onSuccess })).not.toThrow();
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onWriteFailed).not.toHaveBeenCalled();
    });
  });

  describe("onSuccess", () => {
    it("fires once per successful setter call", () => {
      const onSuccess = vi.fn();
      const { result } = renderHook(() => useLocalDb("k", "default", isString));

      result.current[1]("next", { onSuccess });

      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });
});
