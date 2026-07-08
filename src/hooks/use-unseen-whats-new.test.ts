import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WHATS_NEW_LAST_SEEN_LSK } from "../constants";
import { WHATS_NEW_ENTRIES } from "../data/whats-new";
import { useUnseenWhatsNew } from "./use-unseen-whats-new";

vi.mock("../utils/localstorage-telemetry", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../utils/localstorage-telemetry")>()),
  handleLocalDbWriteFailed: vi.fn(),
  reportLocalDbCorruption: vi.fn(),
}));
const { handleLocalDbWriteFailed, reportLocalDbCorruption } = await import(
  "../utils/localstorage-telemetry"
);
const mockHandleWriteFailed = vi.mocked(handleLocalDbWriteFailed);
const mockReportCorruption = vi.mocked(reportLocalDbCorruption);

// Non-empty by construction (see whats-new.test.ts); derive rather than
// hardcode so this suite survives every new changelog entry.
const latestId = WHATS_NEW_ENTRIES[0]?.id ?? "";
const staleId = `${latestId}-stale`;

// happy-dom@20 + vitest@4 expose `window.localStorage` as a plain object
// without the Storage API, so install a hand-rolled in-memory mock — mirrors
// `src/utils/localstorage.test.ts`. Write-failure tests override `setItemMock`.
describe("useUnseenWhatsNew", () => {
  let store: Record<string, string>;
  let setItemMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    store = {};
    setItemMock = vi.fn((k: string, v: string) => {
      store[k] = String(v);
    });
    vi.stubGlobal("localStorage", {
      clear: () => {
        for (const k of Object.keys(store)) {
          delete store[k];
        }
      },
      getItem: vi.fn((k: string) => (k in store ? store[k] : null)),
      key: (i: number) => Object.keys(store)[i] ?? null,
      get length() {
        return Object.keys(store).length;
      },
      removeItem: vi.fn((k: string) => {
        delete store[k];
      }),
      setItem: setItemMock,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("flags unseen on a fresh profile (no stored id)", () => {
    const { result } = renderHook(() => useUnseenWhatsNew());
    expect(result.current.hasUnseen).toBe(true);
  });

  it("flags unseen when the stored id is stale", () => {
    window.localStorage.setItem(
      WHATS_NEW_LAST_SEEN_LSK,
      JSON.stringify(staleId)
    );
    const { result } = renderHook(() => useUnseenWhatsNew());
    expect(result.current.hasUnseen).toBe(true);
  });

  it("is not unseen when the stored id matches the newest entry", () => {
    window.localStorage.setItem(
      WHATS_NEW_LAST_SEEN_LSK,
      JSON.stringify(latestId)
    );
    const { result } = renderHook(() => useUnseenWhatsNew());
    expect(result.current.hasUnseen).toBe(false);
  });

  it("markLatestSeen persists the newest id and clears hasUnseen live", () => {
    const { result } = renderHook(() => useUnseenWhatsNew());
    expect(result.current.hasUnseen).toBe(true);

    act(() => {
      result.current.markLatestSeen();
    });

    expect(store[WHATS_NEW_LAST_SEEN_LSK]).toBe(JSON.stringify(latestId));
    expect(result.current.hasUnseen).toBe(false);
  });

  it("markLatestSeen does not write when the newest id is already seen", () => {
    window.localStorage.setItem(
      WHATS_NEW_LAST_SEEN_LSK,
      JSON.stringify(latestId)
    );
    const { result } = renderHook(() => useUnseenWhatsNew());
    expect(result.current.hasUnseen).toBe(false);

    setItemMock.mockClear();
    act(() => {
      result.current.markLatestSeen();
    });

    expect(setItemMock).not.toHaveBeenCalled();
  });

  it("falls back to unseen and reports corruption for a guard-failing value", () => {
    window.localStorage.setItem(WHATS_NEW_LAST_SEEN_LSK, JSON.stringify(42));
    const { result } = renderHook(() => useUnseenWhatsNew());
    expect(result.current.hasUnseen).toBe(true);
    expect(mockReportCorruption).toHaveBeenCalled();
  });

  it("reports a write failure without throwing when persistence fails", () => {
    setItemMock.mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });
    const { result } = renderHook(() => useUnseenWhatsNew());

    expect(() => {
      act(() => {
        result.current.markLatestSeen();
      });
    }).not.toThrow();
    expect(mockHandleWriteFailed).toHaveBeenCalled();
  });
});
