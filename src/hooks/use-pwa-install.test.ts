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

let mockIsMobile: boolean | undefined = true;
vi.mock("@mantine/hooks", () => ({
  useMediaQuery: () => mockIsMobile,
}));

let mockIsPwa = false;

const { mockLocalStorage } = createMockLocalStorage();
vi.stubGlobal("localStorage", mockLocalStorage);

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
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
