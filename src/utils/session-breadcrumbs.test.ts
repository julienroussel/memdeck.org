import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LAST_SAVE_FAILED_LSK, LAST_SAVE_FAILED_SHOWN_SSK } from "../constants";
import { analytics } from "../services/analytics";
import { createMockLocalStorage } from "../test-utils/mock-local-storage";
import {
  clearLastSaveFailedBreadcrumb,
  hasLastSaveFailedNotificationBeenShown,
  markLastSaveFailedNotificationShown,
  readLastSaveFailedBreadcrumb,
  writeLastSaveFailedBreadcrumb,
} from "./session-breadcrumbs";

const { storage, mockLocalStorage } = createMockLocalStorage();
const { storage: sessionStore, mockLocalStorage: mockSessionStorage } =
  createMockLocalStorage();

Object.defineProperty(globalThis, "localStorage", {
  value: mockLocalStorage,
  writable: true,
});

Object.defineProperty(globalThis, "sessionStorage", {
  value: mockSessionStorage,
  writable: true,
});

beforeEach(() => {
  storage.clear();
  sessionStore.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("session-breadcrumbs", () => {
  it("round-trips a write-failed breadcrumb through write and read", () => {
    writeLastSaveFailedBreadcrumb("write-failed");
    const breadcrumb = readLastSaveFailedBreadcrumb();
    expect(breadcrumb).not.toBeNull();
    expect(breadcrumb?.reason).toBe("write-failed");
    expect(typeof breadcrumb?.failedAt).toBe("string");
    // failedAt is a valid ISO timestamp, not in the future
    const parsed =
      breadcrumb === null ? Number.NaN : Date.parse(breadcrumb.failedAt);
    expect(Number.isFinite(parsed)).toBe(true);
  });

  it("returns null when no breadcrumb has been written", () => {
    expect(readLastSaveFailedBreadcrumb()).toBeNull();
  });

  it("clears a previously written breadcrumb", () => {
    writeLastSaveFailedBreadcrumb("corrupt-prior-state");
    expect(readLastSaveFailedBreadcrumb()).not.toBeNull();
    clearLastSaveFailedBreadcrumb();
    expect(readLastSaveFailedBreadcrumb()).toBeNull();
  });

  it("returns null and does not throw when stored breadcrumb is malformed JSON", () => {
    storage.set(LAST_SAVE_FAILED_LSK, "{not valid json");
    expect(() => readLastSaveFailedBreadcrumb()).not.toThrow();
    expect(readLastSaveFailedBreadcrumb()).toBeNull();
  });

  it("returns null when stored breadcrumb has wrong shape", () => {
    storage.set(LAST_SAVE_FAILED_LSK, JSON.stringify({ reason: "what" }));
    expect(readLastSaveFailedBreadcrumb()).toBeNull();
  });

  it("accepts every documented failure reason", () => {
    for (const reason of [
      "write-failed",
      "serialize-failed",
      "corrupt",
      "corrupt-prior-state",
    ] as const) {
      writeLastSaveFailedBreadcrumb(reason);
      expect(readLastSaveFailedBreadcrumb()?.reason).toBe(reason);
    }
  });

  it("does not throw when localStorage.setItem throws (e.g. quota full)", () => {
    const original = mockLocalStorage.setItem;
    mockLocalStorage.setItem = vi.fn(() => {
      throw new DOMException("quota exceeded", "QuotaExceededError");
    });
    expect(() => writeLastSaveFailedBreadcrumb("write-failed")).not.toThrow();
    mockLocalStorage.setItem = original;
  });

  it("does not throw when localStorage.removeItem throws", () => {
    const original = mockLocalStorage.removeItem;
    mockLocalStorage.removeItem = vi.fn(() => {
      throw new Error("removeItem blocked");
    });
    expect(() => clearLastSaveFailedBreadcrumb()).not.toThrow();
    mockLocalStorage.removeItem = original;
  });

  it("calls analytics.trackError when localStorage.setItem throws", () => {
    const trackErrorSpy = vi
      .spyOn(analytics, "trackError")
      .mockImplementation(() => undefined);
    const original = mockLocalStorage.setItem;
    const failure = new DOMException("quota exceeded", "QuotaExceededError");
    mockLocalStorage.setItem = vi.fn(() => {
      throw failure;
    });

    writeLastSaveFailedBreadcrumb("write-failed");

    expect(trackErrorSpy).toHaveBeenCalledTimes(1);
    expect(trackErrorSpy).toHaveBeenCalledWith(
      failure,
      "writeLastSaveFailedBreadcrumb"
    );

    mockLocalStorage.setItem = original;
    trackErrorSpy.mockRestore();
  });

  it("calls analytics.trackError when the stored breadcrumb is corrupt", () => {
    const trackErrorSpy = vi
      .spyOn(analytics, "trackError")
      .mockImplementation(() => undefined);

    storage.set(LAST_SAVE_FAILED_LSK, JSON.stringify({ reason: "what" }));
    const result = readLastSaveFailedBreadcrumb();

    expect(result).toBeNull();
    expect(trackErrorSpy).toHaveBeenCalledTimes(1);
    const [errArg, contextArg] = trackErrorSpy.mock.calls[0];
    expect(errArg).toBeInstanceOf(Error);
    expect((errArg as Error).message).toContain("corrupt");
    expect(contextArg).toBe("readLastSaveFailedBreadcrumb");

    trackErrorSpy.mockRestore();
  });

  it("calls analytics.trackError when localStorage.removeItem throws on clear", () => {
    const trackErrorSpy = vi
      .spyOn(analytics, "trackError")
      .mockImplementation(() => undefined);
    const original = mockLocalStorage.removeItem;
    const failure = new Error("removeItem blocked");
    mockLocalStorage.removeItem = vi.fn(() => {
      throw failure;
    });

    clearLastSaveFailedBreadcrumb();

    expect(trackErrorSpy).toHaveBeenCalledTimes(1);
    expect(trackErrorSpy).toHaveBeenCalledWith(
      failure,
      "clearLastSaveFailedBreadcrumb"
    );

    mockLocalStorage.removeItem = original;
    trackErrorSpy.mockRestore();
  });

  it("writes a null sentinel when removeItem fails so subsequent reads return null", () => {
    const original = mockLocalStorage.removeItem;
    mockLocalStorage.removeItem = vi.fn(() => {
      throw new Error("removeItem blocked");
    });
    // Pre-seed the breadcrumb so the read would otherwise return a value.
    writeLastSaveFailedBreadcrumb("write-failed");
    expect(readLastSaveFailedBreadcrumb()).not.toBeNull();

    clearLastSaveFailedBreadcrumb();

    // Sentinel write happened — direct storage read confirms the slot now
    // holds a JSON `null` so the high-level read returns null.
    expect(storage.get(LAST_SAVE_FAILED_LSK)).toBe(JSON.stringify(null));
    expect(readLastSaveFailedBreadcrumb()).toBeNull();

    mockLocalStorage.removeItem = original;
  });

  it("does not cascade when both removeItem and the sentinel setItem fail", () => {
    const originalRemove = mockLocalStorage.removeItem;
    const originalSet = mockLocalStorage.setItem;
    mockLocalStorage.removeItem = vi.fn(() => {
      throw new Error("removeItem blocked");
    });
    mockLocalStorage.setItem = vi.fn(() => {
      throw new Error("setItem blocked");
    });

    expect(() => clearLastSaveFailedBreadcrumb()).not.toThrow();

    mockLocalStorage.removeItem = originalRemove;
    mockLocalStorage.setItem = originalSet;
  });

  it("reports analytics for both removeItem AND sentinel setItem failures so the stuck-breadcrumb scenario is observable", () => {
    const trackErrorSpy = vi
      .spyOn(analytics, "trackError")
      .mockImplementation(() => undefined);
    const originalRemove = mockLocalStorage.removeItem;
    const originalSet = mockLocalStorage.setItem;
    const removeFailure = new Error("removeItem blocked");
    const setFailure = new Error("setItem blocked");
    mockLocalStorage.removeItem = vi.fn(() => {
      throw removeFailure;
    });
    mockLocalStorage.setItem = vi.fn(() => {
      throw setFailure;
    });

    clearLastSaveFailedBreadcrumb();

    // Two analytics events: one for the original removeItem failure (pre-existing
    // behavior) and one for the sentinel-setItem failure that pins the breadcrumb.
    expect(trackErrorSpy).toHaveBeenCalledTimes(2);
    const contexts = trackErrorSpy.mock.calls.map((call) => call[1]);
    expect(contexts).toContain("clearLastSaveFailedBreadcrumb");
    expect(contexts).toContain("clearLastSaveFailedBreadcrumb:sentinel");
    const sentinelCall = trackErrorSpy.mock.calls.find(
      (call) => call[1] === "clearLastSaveFailedBreadcrumb:sentinel"
    );
    expect(sentinelCall?.[0]).toBe(setFailure);

    mockLocalStorage.removeItem = originalRemove;
    mockLocalStorage.setItem = originalSet;
    trackErrorSpy.mockRestore();
  });

  it("does not cascade when analytics.trackError itself throws on a breadcrumb-clear failure", () => {
    const trackErrorSpy = vi
      .spyOn(analytics, "trackError")
      .mockImplementation(() => {
        throw new Error("analytics broken");
      });
    const original = mockLocalStorage.removeItem;
    mockLocalStorage.removeItem = vi.fn(() => {
      throw new Error("removeItem blocked");
    });

    expect(() => clearLastSaveFailedBreadcrumb()).not.toThrow();

    mockLocalStorage.removeItem = original;
    trackErrorSpy.mockRestore();
  });

  it("does not cascade when analytics.trackError itself throws on a breadcrumb-write failure", () => {
    const trackErrorSpy = vi
      .spyOn(analytics, "trackError")
      .mockImplementation(() => {
        throw new Error("analytics broken");
      });
    const original = mockLocalStorage.setItem;
    mockLocalStorage.setItem = vi.fn(() => {
      throw new DOMException("quota exceeded", "QuotaExceededError");
    });

    expect(() => writeLastSaveFailedBreadcrumb("write-failed")).not.toThrow();

    mockLocalStorage.setItem = original;
    trackErrorSpy.mockRestore();
  });

  describe("hasLastSaveFailedNotificationBeenShown / markLastSaveFailedNotificationShown", () => {
    const FAILED_AT = "2025-01-01T00:00:00.000Z";

    it("returns false when no sentinel has been written", () => {
      expect(hasLastSaveFailedNotificationBeenShown(FAILED_AT)).toBe(false);
    });

    it("returns true after marking the sentinel for the same failedAt", () => {
      markLastSaveFailedNotificationShown(FAILED_AT);
      expect(hasLastSaveFailedNotificationBeenShown(FAILED_AT)).toBe(true);
    });

    it("returns false for a different failedAt — a new breadcrumb naturally invalidates the prior sentinel", () => {
      markLastSaveFailedNotificationShown(FAILED_AT);
      expect(
        hasLastSaveFailedNotificationBeenShown("2025-06-01T12:34:56.789Z")
      ).toBe(false);
    });

    it("writes the failedAt string verbatim to the configured sessionStorage key", () => {
      markLastSaveFailedNotificationShown(FAILED_AT);
      expect(sessionStore.get(LAST_SAVE_FAILED_SHOWN_SSK)).toBe(FAILED_AT);
    });

    it("markLastSaveFailedNotificationShown does not throw when sessionStorage.setItem throws and reports analytics", () => {
      const trackErrorSpy = vi
        .spyOn(analytics, "trackError")
        .mockImplementation(() => undefined);
      const original = mockSessionStorage.setItem;
      const failure = new DOMException("quota exceeded", "QuotaExceededError");
      mockSessionStorage.setItem = vi.fn(() => {
        throw failure;
      });

      expect(() =>
        markLastSaveFailedNotificationShown(FAILED_AT)
      ).not.toThrow();

      expect(trackErrorSpy).toHaveBeenCalledWith(
        failure,
        "markLastSaveFailedNotificationShown"
      );

      mockSessionStorage.setItem = original;
      trackErrorSpy.mockRestore();
    });

    it("hasLastSaveFailedNotificationBeenShown returns false and reports analytics when sessionStorage.getItem throws", () => {
      const trackErrorSpy = vi
        .spyOn(analytics, "trackError")
        .mockImplementation(() => undefined);
      const original = mockSessionStorage.getItem;
      const failure = new Error("getItem blocked");
      mockSessionStorage.getItem = vi.fn(() => {
        throw failure;
      });

      expect(hasLastSaveFailedNotificationBeenShown(FAILED_AT)).toBe(false);
      expect(trackErrorSpy).toHaveBeenCalledWith(
        failure,
        "hasLastSaveFailedNotificationBeenShown"
      );

      mockSessionStorage.getItem = original;
      trackErrorSpy.mockRestore();
    });

    it("does not cascade when analytics.trackError itself throws on a sentinel write failure", () => {
      const trackErrorSpy = vi
        .spyOn(analytics, "trackError")
        .mockImplementation(() => {
          throw new Error("analytics broken");
        });
      const original = mockSessionStorage.setItem;
      mockSessionStorage.setItem = vi.fn(() => {
        throw new DOMException("quota exceeded", "QuotaExceededError");
      });

      expect(() =>
        markLastSaveFailedNotificationShown(FAILED_AT)
      ).not.toThrow();
      // Setter threw, so nothing should have been persisted — guards against
      // a regression where the catch block accidentally writes a partial value.
      expect(sessionStore.get(LAST_SAVE_FAILED_SHOWN_SSK)).toBeUndefined();

      mockSessionStorage.setItem = original;
      trackErrorSpy.mockRestore();
    });

    it("does not cascade when analytics.trackError itself throws on a sentinel read failure", () => {
      const trackErrorSpy = vi
        .spyOn(analytics, "trackError")
        .mockImplementation(() => {
          throw new Error("analytics broken");
        });
      const original = mockSessionStorage.getItem;
      mockSessionStorage.getItem = vi.fn(() => {
        throw new Error("getItem blocked");
      });

      expect(hasLastSaveFailedNotificationBeenShown(FAILED_AT)).toBe(false);

      mockSessionStorage.getItem = original;
      trackErrorSpy.mockRestore();
    });
  });
});
