import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockHandleLocalDbWriteFailed =
  vi.fn<(key: string, cause: unknown) => void>();

vi.mock("./localstorage-telemetry", () => ({
  handleLocalDbWriteFailed: mockHandleLocalDbWriteFailed,
}));

const { createColorSchemeManager } = await import("./color-scheme-manager");

const KEY = "memdeck-app-color-scheme";

const quotaError = (): DOMException =>
  new DOMException("quota", "QuotaExceededError");

describe("createColorSchemeManager", () => {
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
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  describe("get", () => {
    it.each([
      "light",
      "dark",
      "auto",
    ] as const)("returns stored value when it is %s", (scheme) => {
      store[KEY] = scheme;
      const manager = createColorSchemeManager(KEY);
      expect(manager.get("light")).toBe(scheme);
    });

    it("returns defaultValue when the key is absent", () => {
      const manager = createColorSchemeManager(KEY);
      expect(manager.get("dark")).toBe("dark");
    });

    it("returns defaultValue when the stored value is not a valid color scheme", () => {
      store[KEY] = "neon-purple";
      const manager = createColorSchemeManager(KEY);
      expect(manager.get("light")).toBe("light");
    });

    it("returns defaultValue when getItem throws", () => {
      getItemMock.mockImplementation(() => {
        throw new Error("read-error");
      });
      const manager = createColorSchemeManager(KEY);
      expect(manager.get("dark")).toBe("dark");
    });
  });

  describe("set", () => {
    it("writes the value to localStorage", () => {
      const manager = createColorSchemeManager(KEY);
      manager.set("dark");
      expect(setItemMock).toHaveBeenCalledWith(KEY, "dark");
      expect(store[KEY]).toBe("dark");
    });

    it("calls handleLocalDbWriteFailed with the key and error when setItem throws", () => {
      const err = quotaError();
      setItemMock.mockImplementation(() => {
        throw err;
      });

      const manager = createColorSchemeManager(KEY);
      manager.set("dark");

      expect(mockHandleLocalDbWriteFailed).toHaveBeenCalledTimes(1);
      expect(mockHandleLocalDbWriteFailed).toHaveBeenCalledWith(KEY, err);
    });

    it("does not call handleLocalDbWriteFailed on successful writes", () => {
      const manager = createColorSchemeManager(KEY);
      manager.set("light");
      manager.set("dark");
      expect(mockHandleLocalDbWriteFailed).not.toHaveBeenCalled();
    });

    it("dedup: fires handleLocalDbWriteFailed once across consecutive failures", () => {
      setItemMock.mockImplementation(() => {
        throw quotaError();
      });

      const manager = createColorSchemeManager(KEY);
      manager.set("dark");
      manager.set("light");
      manager.set("auto");

      expect(mockHandleLocalDbWriteFailed).toHaveBeenCalledTimes(1);
      expect(setItemMock).toHaveBeenCalledTimes(3);
    });

    it("re-fires after a successful write resets the latch", () => {
      setItemMock
        .mockImplementationOnce(() => {
          throw quotaError();
        })
        .mockImplementationOnce((k: string, v: string) => {
          store[k] = v;
        })
        .mockImplementationOnce(() => {
          throw quotaError();
        });

      const manager = createColorSchemeManager(KEY);
      manager.set("dark");
      manager.set("light");
      manager.set("auto");

      expect(mockHandleLocalDbWriteFailed).toHaveBeenCalledTimes(2);
    });

    it("each manager instance has an independent dedup latch", () => {
      setItemMock.mockImplementation(() => {
        throw quotaError();
      });

      const m1 = createColorSchemeManager(KEY);
      const m2 = createColorSchemeManager(KEY);
      m1.set("dark");
      m1.set("light");
      m2.set("dark");
      m2.set("light");

      expect(mockHandleLocalDbWriteFailed).toHaveBeenCalledTimes(2);
    });

    it("emits a DEV console.warn when setItem throws in DEV mode", () => {
      vi.stubEnv("DEV", true);
      const consoleWarnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {
          // Suppress console output
        });

      const err = quotaError();
      setItemMock.mockImplementation(() => {
        throw err;
      });

      const manager = createColorSchemeManager(KEY);
      manager.set("dark");

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        `[localStorage] Write failed for key "${KEY}":`,
        err
      );

      consoleWarnSpy.mockRestore();
    });

    it("does not emit a DEV console.warn when setItem throws in production", () => {
      vi.stubEnv("DEV", false);
      const consoleWarnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {
          // Suppress console output
        });

      setItemMock.mockImplementation(() => {
        throw quotaError();
      });

      const manager = createColorSchemeManager(KEY);
      manager.set("dark");

      expect(consoleWarnSpy).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });
  });

  describe("subscribe", () => {
    it("fires onUpdate when a cross-tab storage event matches the key with a valid value", () => {
      const onUpdate = vi.fn();
      const manager = createColorSchemeManager(KEY);
      manager.subscribe(onUpdate);

      window.dispatchEvent(
        new StorageEvent("storage", {
          key: KEY,
          newValue: "dark",
          storageArea: window.localStorage,
        })
      );

      expect(onUpdate).toHaveBeenCalledTimes(1);
      expect(onUpdate).toHaveBeenCalledWith("dark");
    });

    it("ignores storage events from a different storage area (e.g., sessionStorage)", () => {
      const onUpdate = vi.fn();
      const manager = createColorSchemeManager(KEY);
      manager.subscribe(onUpdate);

      window.dispatchEvent(
        new StorageEvent("storage", {
          key: KEY,
          newValue: "dark",
          storageArea: window.sessionStorage,
        })
      );

      expect(onUpdate).not.toHaveBeenCalled();
    });

    it("ignores storage events for other keys", () => {
      const onUpdate = vi.fn();
      const manager = createColorSchemeManager(KEY);
      manager.subscribe(onUpdate);

      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "some-other-key",
          newValue: "dark",
          storageArea: window.localStorage,
        })
      );

      expect(onUpdate).not.toHaveBeenCalled();
    });

    it("ignores storage events with an invalid color-scheme value", () => {
      const onUpdate = vi.fn();
      const manager = createColorSchemeManager(KEY);
      manager.subscribe(onUpdate);

      window.dispatchEvent(
        new StorageEvent("storage", {
          key: KEY,
          newValue: "neon-purple",
          storageArea: window.localStorage,
        })
      );

      expect(onUpdate).not.toHaveBeenCalled();
    });

    it("ignores storage events whose newValue is null (sibling tab cleared the key)", () => {
      const onUpdate = vi.fn();
      const manager = createColorSchemeManager(KEY);
      manager.subscribe(onUpdate);

      window.dispatchEvent(
        new StorageEvent("storage", {
          key: KEY,
          newValue: null,
          storageArea: window.localStorage,
        })
      );

      expect(onUpdate).not.toHaveBeenCalled();
    });

    it("detaches the previous listener when subscribe is called twice without unsubscribe", () => {
      const firstOnUpdate = vi.fn();
      const secondOnUpdate = vi.fn();
      const manager = createColorSchemeManager(KEY);
      manager.subscribe(firstOnUpdate);
      manager.subscribe(secondOnUpdate);

      window.dispatchEvent(
        new StorageEvent("storage", {
          key: KEY,
          newValue: "dark",
          storageArea: window.localStorage,
        })
      );

      expect(firstOnUpdate).not.toHaveBeenCalled();
      expect(secondOnUpdate).toHaveBeenCalledTimes(1);
      expect(secondOnUpdate).toHaveBeenCalledWith("dark");
    });
  });

  describe("unsubscribe", () => {
    it("removes the storage listener so subsequent events do not fire onUpdate", () => {
      const onUpdate = vi.fn();
      const manager = createColorSchemeManager(KEY);
      manager.subscribe(onUpdate);
      manager.unsubscribe();

      window.dispatchEvent(
        new StorageEvent("storage", {
          key: KEY,
          newValue: "dark",
          storageArea: window.localStorage,
        })
      );

      expect(onUpdate).not.toHaveBeenCalled();
    });

    it("is a no-op when called without a prior subscribe", () => {
      const manager = createColorSchemeManager(KEY);
      expect(() => manager.unsubscribe()).not.toThrow();
    });

    it("re-attaches the listener after unsubscribe so a subsequent subscribe receives events", () => {
      const firstOnUpdate = vi.fn();
      const secondOnUpdate = vi.fn();
      const manager = createColorSchemeManager(KEY);
      manager.subscribe(firstOnUpdate);
      manager.unsubscribe();
      manager.subscribe(secondOnUpdate);

      window.dispatchEvent(
        new StorageEvent("storage", {
          key: KEY,
          newValue: "dark",
          storageArea: window.localStorage,
        })
      );

      expect(firstOnUpdate).not.toHaveBeenCalled();
      expect(secondOnUpdate).toHaveBeenCalledTimes(1);
      expect(secondOnUpdate).toHaveBeenCalledWith("dark");
    });
  });

  describe("clear", () => {
    it("calls removeItem with the key", () => {
      store[KEY] = "dark";
      const manager = createColorSchemeManager(KEY);
      manager.clear();
      expect(removeItemMock).toHaveBeenCalledWith(KEY);
      expect(store[KEY]).toBeUndefined();
    });

    it("swallows removeItem failures (mirrors useLocalDb.removeValue)", () => {
      removeItemMock.mockImplementation(() => {
        throw new Error("remove-error");
      });
      const manager = createColorSchemeManager(KEY);
      expect(() => manager.clear()).not.toThrow();
    });
  });
});
