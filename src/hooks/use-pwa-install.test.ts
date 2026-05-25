import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  PWA_INSTALL_COOLDOWN_MS,
  PWA_INSTALL_DISMISSED_AT_LSK,
  PWA_INSTALL_PERMANENTLY_DISMISSED_LSK,
  SESSION_HISTORY_LSK,
} from "../constants";
import { createMockLocalStorage } from "../test-utils/mock-local-storage";
import { usePwaInstall } from "./use-pwa-install";

vi.mock("../utils/is-pwa", () => ({
  isPwa: () => mockIsPwa,
}));

const mockTrackError = vi.fn();
vi.mock("../services/analytics", () => ({
  analytics: {
    trackError: (...args: unknown[]) => mockTrackError(...args),
  },
}));

let mockIsMobile: boolean | undefined = true;
// Partial mock: only `useMediaQuery` is stubbed. Everything else
// (including `readLocalStorageValue`, used by `getStoredValue` for the
// SESSION_HISTORY_LSK read in `hasCompletedSession`) is forwarded to the
// real `@mantine/hooks` so it works against the `vi.stubGlobal("localStorage", ...)`
// mock declared below.
vi.mock("@mantine/hooks", async () => {
  const actual =
    await vi.importActual<typeof import("@mantine/hooks")>("@mantine/hooks");
  return {
    ...actual,
    useMediaQuery: () => mockIsMobile,
  };
});

let mockIsPwa = false;

const { mockLocalStorage } = createMockLocalStorage();
vi.stubGlobal("localStorage", mockLocalStorage);

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  mockTrackError.mockReset();
  mockLocalStorage.clear();
  mockIsPwa = false;
  mockIsMobile = true;
});

const withSession = () => {
  mockLocalStorage.setItem(SESSION_HISTORY_LSK, JSON.stringify([{ id: 1 }]));
};

describe("usePwaInstall", () => {
  it("is not eligible when already in standalone mode", () => {
    mockIsPwa = true;
    withSession();
    const { result } = renderHook(() => usePwaInstall());
    expect(result.current.eligible).toBe(false);
  });

  it("is not eligible on desktop", () => {
    mockIsMobile = false;
    withSession();
    const { result } = renderHook(() => usePwaInstall());
    expect(result.current.eligible).toBe(false);
  });

  it("is not eligible when no sessions completed", () => {
    const { result } = renderHook(() => usePwaInstall());
    expect(result.current.eligible).toBe(false);
  });

  it("is not eligible when cooldown has not elapsed", () => {
    withSession();
    mockLocalStorage.setItem(
      PWA_INSTALL_DISMISSED_AT_LSK,
      String(Date.now() - 1000)
    );
    const { result } = renderHook(() => usePwaInstall());
    expect(result.current.eligible).toBe(false);
  });

  it("is not eligible when permanently dismissed", () => {
    withSession();
    mockLocalStorage.setItem(PWA_INSTALL_PERMANENTLY_DISMISSED_LSK, "true");
    const { result } = renderHook(() => usePwaInstall());
    expect(result.current.eligible).toBe(false);
  });

  it("is eligible when all conditions are met", () => {
    withSession();
    const { result } = renderHook(() => usePwaInstall());
    expect(result.current.eligible).toBe(true);
  });

  it("install returns true and uses native prompt when available", () => {
    withSession();
    const { result } = renderHook(() => usePwaInstall());

    const mockPrompt = vi.fn().mockResolvedValue(undefined);
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.defineProperty(event, "prompt", { value: mockPrompt });
    window.dispatchEvent(event);

    let nativeUsed = false;
    act(() => {
      nativeUsed = result.current.install();
    });
    expect(nativeUsed).toBe(true);
    expect(mockPrompt).toHaveBeenCalledOnce();
    expect(result.current.eligible).toBe(false);
  });

  it("install returns false when no native prompt available", () => {
    withSession();
    const { result } = renderHook(() => usePwaInstall());

    let nativeUsed = true;
    act(() => {
      nativeUsed = result.current.install();
    });
    expect(nativeUsed).toBe(false);
  });

  it("install rejection re-enables eligibility and restores deferredPromptRef so a second install attempt can succeed", async () => {
    withSession();
    const { result } = renderHook(() => usePwaInstall());

    const firstPrompt = vi
      .fn()
      .mockRejectedValueOnce(new Error("User cancelled"))
      .mockResolvedValueOnce(undefined);
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.defineProperty(event, "prompt", { value: firstPrompt });
    window.dispatchEvent(event);

    let firstCall = false;
    await act(async () => {
      firstCall = result.current.install();
      // Flush the rejected prompt() microtask so the catch handler runs.
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(firstCall).toBe(true);
    expect(result.current.eligible).toBe(true);

    let secondCall = false;
    await act(async () => {
      secondCall = result.current.install();
      await Promise.resolve();
    });
    expect(secondCall).toBe(true);
    expect(firstPrompt).toHaveBeenCalledTimes(2);
    expect(result.current.eligible).toBe(false);
  });

  it("install rejection forwards a wrapped error with name PwaInstallPromptRejected to analytics.trackError", async () => {
    withSession();
    const { result } = renderHook(() => usePwaInstall());

    const mockPrompt = vi.fn().mockRejectedValue(new Error("User cancelled"));
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.defineProperty(event, "prompt", { value: mockPrompt });
    window.dispatchEvent(event);

    await act(async () => {
      result.current.install();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockTrackError).toHaveBeenCalledOnce();
    const reported = mockTrackError.mock.calls[0]?.[0];
    if (!(reported instanceof Error)) {
      throw new Error("Expected trackError to be called with an Error");
    }
    expect(reported.name).toBe("PwaInstallPromptRejected");
    expect(reported.message).toBe("User cancelled");
  });

  it("dismiss stores timestamp in localStorage", () => {
    const now = 1_700_000_000_000;
    vi.spyOn(Date, "now").mockReturnValue(now);
    withSession();
    const { result } = renderHook(() => usePwaInstall());
    act(() => {
      result.current.dismiss();
    });
    expect(mockLocalStorage.getItem(PWA_INSTALL_DISMISSED_AT_LSK)).toBe(
      String(now)
    );
    expect(result.current.eligible).toBe(false);
  });

  it("is not eligible when useMediaQuery returns undefined", () => {
    mockIsMobile = undefined;
    withSession();
    const { result } = renderHook(() => usePwaInstall());
    expect(result.current.eligible).toBe(false);
  });

  it("second dismiss sets permanent flag", () => {
    const now = 1_700_000_000_000;
    vi.spyOn(Date, "now").mockReturnValue(now);
    withSession();
    mockLocalStorage.setItem(
      PWA_INSTALL_DISMISSED_AT_LSK,
      String(now - PWA_INSTALL_COOLDOWN_MS - 1000)
    );
    const { result } = renderHook(() => usePwaInstall());
    act(() => {
      result.current.dismiss();
    });
    expect(
      mockLocalStorage.getItem(PWA_INSTALL_PERMANENTLY_DISMISSED_LSK)
    ).toBe("true");
  });
});
