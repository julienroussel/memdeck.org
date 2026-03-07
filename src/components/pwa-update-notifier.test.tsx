import { notifications } from "@mantine/notifications";
import { render } from "@testing-library/react";
import type { RegisterSWOptions } from "vite-plugin-pwa/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  COMMIT_HASH_LSK,
  PWA_UPDATE_COOLDOWN_MS,
  PWA_UPDATE_TOAST_TIMEOUT,
  UPDATE_NOTIFIED_AT_LSK,
} from "../constants";
import { createMockLocalStorage } from "../test-utils/mock-local-storage";
import { PwaUpdateNotifier } from "./pwa-update-notifier";

vi.stubGlobal("__COMMIT_HASH__", "abc1234");

const mockUseRegisterSW = vi.fn((_options?: RegisterSWOptions) => ({}));

vi.mock("virtual:pwa-register/react", () => ({
  useRegisterSW: (options?: RegisterSWOptions) => mockUseRegisterSW(options),
}));

vi.mock("@mantine/notifications", () => ({
  notifications: { show: vi.fn() },
}));

const mockTrackFeatureUsed = vi.fn();
vi.mock("../services/analytics", () => ({
  analytics: {
    trackFeatureUsed: (...args: unknown[]) => mockTrackFeatureUsed(...args),
  },
}));

const { mockLocalStorage } = createMockLocalStorage();
vi.stubGlobal("localStorage", mockLocalStorage);

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  mockLocalStorage.clear();
  mockUseRegisterSW.mockImplementation(() => ({}));
});

describe("PwaUpdateNotifier", () => {
  it("renders nothing", () => {
    const { container } = render(<PwaUpdateNotifier />);
    expect(container.innerHTML).toBe("");
  });

  it("does not show a toast on first visit (no stored hash)", () => {
    render(<PwaUpdateNotifier />);
    expect(notifications.show).not.toHaveBeenCalled();
    expect(mockLocalStorage.getItem(COMMIT_HASH_LSK)).toBe("abc1234");
  });

  it("does not show a toast when stored hash matches current", () => {
    mockLocalStorage.setItem(COMMIT_HASH_LSK, "abc1234");
    render(<PwaUpdateNotifier />);
    expect(notifications.show).not.toHaveBeenCalled();
  });

  it("shows a teal auto-closing toast when hash differs and cooldown expired", () => {
    mockLocalStorage.setItem(COMMIT_HASH_LSK, "old_hash");
    render(<PwaUpdateNotifier />);

    expect(notifications.show).toHaveBeenCalledOnce();
    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        color: "teal",
        autoClose: PWA_UPDATE_TOAST_TIMEOUT,
        title: "Updated",
        message: "MemDeck has been updated.",
        withCloseButton: true,
      })
    );
  });

  it("updates stored hash and timestamp after showing toast", () => {
    const now = 1_700_000_000_000;
    vi.spyOn(Date, "now").mockReturnValue(now);
    mockLocalStorage.setItem(COMMIT_HASH_LSK, "old_hash");

    render(<PwaUpdateNotifier />);

    expect(mockLocalStorage.getItem(COMMIT_HASH_LSK)).toBe("abc1234");
    expect(mockLocalStorage.getItem(UPDATE_NOTIFIED_AT_LSK)).toBe(String(now));
  });

  it("does not show a toast when within 24h cooldown", () => {
    const now = 1_700_000_000_000;
    vi.spyOn(Date, "now").mockReturnValue(now);
    mockLocalStorage.setItem(COMMIT_HASH_LSK, "old_hash");
    mockLocalStorage.setItem(
      UPDATE_NOTIFIED_AT_LSK,
      String(now - PWA_UPDATE_COOLDOWN_MS + 1000)
    );

    render(<PwaUpdateNotifier />);

    expect(notifications.show).not.toHaveBeenCalled();
    expect(mockLocalStorage.getItem(COMMIT_HASH_LSK)).toBe("abc1234");
  });

  it("shows a toast when cooldown has expired (25h ago)", () => {
    const now = 1_700_000_000_000;
    vi.spyOn(Date, "now").mockReturnValue(now);
    mockLocalStorage.setItem(COMMIT_HASH_LSK, "old_hash");
    mockLocalStorage.setItem(
      UPDATE_NOTIFIED_AT_LSK,
      String(now - PWA_UPDATE_COOLDOWN_MS - 3_600_000)
    );

    render(<PwaUpdateNotifier />);

    expect(notifications.show).toHaveBeenCalledOnce();
  });

  it("tracks 'PWA Update Applied' analytics event", () => {
    mockLocalStorage.setItem(COMMIT_HASH_LSK, "old_hash");
    render(<PwaUpdateNotifier />);

    expect(mockTrackFeatureUsed).toHaveBeenCalledWith("PWA Update Applied");
  });

  it("registers the service worker with immediate option and onRegisteredSW", () => {
    render(<PwaUpdateNotifier />);
    expect(mockUseRegisterSW).toHaveBeenCalledWith(
      expect.objectContaining({
        immediate: true,
        onRegisteredSW: expect.any(Function),
      })
    );
  });

  it("sets up a periodic update check when SW is registered", () => {
    vi.useFakeTimers();
    const mockUpdate = vi.fn();
    // Partial mock of browser ServiceWorkerRegistration API
    const fakeRegistration = {
      update: mockUpdate,
    } as unknown as ServiceWorkerRegistration;

    mockUseRegisterSW.mockImplementation((options?: RegisterSWOptions) => {
      options?.onRegisteredSW?.("", fakeRegistration);
      return {};
    });

    render(<PwaUpdateNotifier />);

    expect(mockUpdate).not.toHaveBeenCalled();
    vi.advanceTimersByTime(24 * 60 * 60 * 1000);
    expect(mockUpdate).toHaveBeenCalledOnce();

    vi.useRealTimers();
  });

  it("does not set up periodic updates when registration is undefined", () => {
    vi.useFakeTimers();

    mockUseRegisterSW.mockImplementation((options?: RegisterSWOptions) => {
      options?.onRegisteredSW?.("", undefined);
      return {};
    });

    render(<PwaUpdateNotifier />);

    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(24 * 60 * 60 * 1000);

    vi.useRealTimers();
  });

  it("clears previous interval when onRegisteredSW is called again", () => {
    vi.useFakeTimers();
    const mockUpdate1 = vi.fn();
    const mockUpdate2 = vi.fn();
    // Partial mock of browser ServiceWorkerRegistration API
    const reg1 = {
      update: mockUpdate1,
    } as unknown as ServiceWorkerRegistration;
    // Partial mock of browser ServiceWorkerRegistration API
    const reg2 = {
      update: mockUpdate2,
    } as unknown as ServiceWorkerRegistration;

    mockUseRegisterSW.mockImplementation((options?: RegisterSWOptions) => {
      options?.onRegisteredSW?.("", reg1);
      options?.onRegisteredSW?.("", reg2);
      return {};
    });

    render(<PwaUpdateNotifier />);

    vi.advanceTimersByTime(24 * 60 * 60 * 1000);
    expect(mockUpdate1).not.toHaveBeenCalled();
    expect(mockUpdate2).toHaveBeenCalledOnce();

    vi.useRealTimers();
  });

  it("clears the periodic update interval on unmount", () => {
    vi.useFakeTimers();
    const mockUpdate = vi.fn();
    // Partial mock of browser ServiceWorkerRegistration API
    const fakeRegistration = {
      update: mockUpdate,
    } as unknown as ServiceWorkerRegistration;

    mockUseRegisterSW.mockImplementation((options?: RegisterSWOptions) => {
      options?.onRegisteredSW?.("", fakeRegistration);
      return {};
    });

    const { unmount } = render(<PwaUpdateNotifier />);
    unmount();

    vi.advanceTimersByTime(24 * 60 * 60 * 1000);
    expect(mockUpdate).not.toHaveBeenCalled();

    vi.useRealTimers();
  });
});
