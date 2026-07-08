import { notifications } from "@mantine/notifications";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { RegisterSWOptions } from "vite-plugin-pwa/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { COMMIT_HASH_LSK, WHATS_NEW_LAST_ANNOUNCED_LSK } from "../constants";
import { WHATS_NEW_ENTRIES } from "../data/whats-new";
import { render as renderWithProviders } from "../test-utils";
import { createMockLocalStorage } from "../test-utils/mock-local-storage";
import { PwaUpdateNotifier } from "./pwa-update-notifier";

vi.stubGlobal("__COMMIT_HASH__", "abc1234");

// The gating tests use the real data module's newest entry id. Narrow here so
// the assumption (the changelog is non-empty) is explicit and typed.
const [latestEntry] = WHATS_NEW_ENTRIES;
if (!latestEntry) {
  throw new Error("WHATS_NEW_ENTRIES must be non-empty for these tests");
}
const latestEntryId = latestEntry.id;

const mockUseRegisterSW = vi.fn((_options?: RegisterSWOptions) => ({}));

vi.mock("virtual:pwa-register/react", () => ({
  useRegisterSW: (options?: RegisterSWOptions) => mockUseRegisterSW(options),
}));

vi.mock("@mantine/notifications", () => ({
  notifications: { hide: vi.fn(), show: vi.fn() },
}));

const mockTrackFeatureUsed = vi.fn();
const mockTrackError = vi.fn();
vi.mock("../services/analytics", () => ({
  analytics: {
    trackError: (...args: unknown[]) => mockTrackError(...args),
    trackFeatureUsed: (...args: unknown[]) => mockTrackFeatureUsed(...args),
  },
}));

const mockReportLocalDbCorruption = vi.fn();
const mockHandleLocalDbWriteFailed = vi.fn();
vi.mock("../utils/localstorage-telemetry", () => ({
  handleLocalDbWriteFailed: (...args: unknown[]) =>
    mockHandleLocalDbWriteFailed(...args),
  reportLocalDbCorruption: (...args: unknown[]) =>
    mockReportLocalDbCorruption(...args),
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

  it("shows a teal persistent toast when hash differs and a new entry is unannounced", () => {
    mockLocalStorage.setItem(COMMIT_HASH_LSK, "old_hash");
    render(<PwaUpdateNotifier />);

    expect(notifications.show).toHaveBeenCalledOnce();
    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        autoClose: false,
        color: "teal",
        id: "pwa-update",
        title: "Updated",
        withCloseButton: true,
      })
    );
  });

  it("updates the stored hash after showing the toast", () => {
    mockLocalStorage.setItem(COMMIT_HASH_LSK, "old_hash");

    render(<PwaUpdateNotifier />);

    expect(mockLocalStorage.getItem(COMMIT_HASH_LSK)).toBe("abc1234");
  });

  it("announces and tracks back-to-back updates without a cooldown", () => {
    mockLocalStorage.setItem(COMMIT_HASH_LSK, "old_hash_1");
    const { unmount } = render(<PwaUpdateNotifier />);

    expect(notifications.show).toHaveBeenCalledTimes(1);
    expect(mockTrackFeatureUsed).toHaveBeenCalledTimes(1);
    unmount();

    // A second update applied right after: telemetry fires again, but the gate
    // keeps the toast silent because the latest entry is already announced.
    mockLocalStorage.setItem(COMMIT_HASH_LSK, "old_hash_2");
    render(<PwaUpdateNotifier />);

    expect(mockTrackFeatureUsed).toHaveBeenCalledTimes(2);
    expect(notifications.show).toHaveBeenCalledTimes(1);
  });

  it("tracks 'PWA Update Applied' analytics event", () => {
    mockLocalStorage.setItem(COMMIT_HASH_LSK, "old_hash");
    render(<PwaUpdateNotifier />);

    expect(mockTrackFeatureUsed).toHaveBeenCalledWith("PWA Update Applied");
  });

  it("is silent when the latest entry was already announced (noise deploy)", () => {
    mockLocalStorage.setItem(COMMIT_HASH_LSK, "old_hash");
    mockLocalStorage.setItem(WHATS_NEW_LAST_ANNOUNCED_LSK, latestEntryId);

    render(<PwaUpdateNotifier />);

    expect(notifications.show).not.toHaveBeenCalled();
  });

  it("still tracks telemetry when the toast is gated silent", () => {
    mockLocalStorage.setItem(COMMIT_HASH_LSK, "old_hash");
    mockLocalStorage.setItem(WHATS_NEW_LAST_ANNOUNCED_LSK, latestEntryId);

    render(<PwaUpdateNotifier />);

    expect(mockTrackFeatureUsed).toHaveBeenCalledWith("PWA Update Applied");
    expect(notifications.show).not.toHaveBeenCalled();
  });

  it("records the announced entry id when the toast shows", () => {
    mockLocalStorage.setItem(COMMIT_HASH_LSK, "old_hash");

    render(<PwaUpdateNotifier />);

    expect(notifications.show).toHaveBeenCalledOnce();
    expect(mockLocalStorage.getItem(WHATS_NEW_LAST_ANNOUNCED_LSK)).toBe(
      latestEntryId
    );
  });

  it("seeds the announced marker on first visit so new users aren't toasted", () => {
    render(<PwaUpdateNotifier />);

    expect(notifications.show).not.toHaveBeenCalled();
    expect(mockLocalStorage.getItem(COMMIT_HASH_LSK)).toBe("abc1234");
    expect(mockLocalStorage.getItem(WHATS_NEW_LAST_ANNOUNCED_LSK)).toBe(
      latestEntryId
    );
  });

  it("renders a 'See What's New' link to /whats-new/ that dismisses the toast", async () => {
    mockLocalStorage.setItem(COMMIT_HASH_LSK, "old_hash");
    render(<PwaUpdateNotifier />);

    const call = vi.mocked(notifications.show).mock.calls[0]?.[0];
    expect(call).toBeDefined();
    renderWithProviders(<div>{call?.message}</div>);

    const link = screen.getByRole("link", { name: "See What's New" });
    expect(link).toHaveAttribute("href", "/whats-new/");

    await userEvent.click(link);
    expect(notifications.hide).toHaveBeenCalledWith("pwa-update");
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

  it("tracks PwaUpdateCheckFailed analytics error when registration.update() rejects", async () => {
    vi.useFakeTimers();
    const mockUpdate = vi.fn(() => Promise.reject(new Error("network down")));
    // Partial mock of browser ServiceWorkerRegistration API
    const fakeRegistration = {
      update: mockUpdate,
    } as unknown as ServiceWorkerRegistration;

    mockUseRegisterSW.mockImplementation((options?: RegisterSWOptions) => {
      options?.onRegisteredSW?.("", fakeRegistration);
      return {};
    });

    render(<PwaUpdateNotifier />);

    await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1000);

    expect(mockUpdate).toHaveBeenCalledOnce();
    expect(mockTrackError).toHaveBeenCalledOnce();
    expect(mockTrackError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "PwaUpdateCheckFailed" })
    );

    vi.useRealTimers();
  });

  it("reports corruption when localStorage.getItem throws (Safari ITP)", () => {
    const originalGetItem = mockLocalStorage.getItem;
    mockLocalStorage.getItem = vi.fn(() => {
      throw new Error("ITP");
    });

    try {
      render(<PwaUpdateNotifier />);

      expect(mockReportLocalDbCorruption).toHaveBeenCalledWith(
        COMMIT_HASH_LSK,
        expect.any(Error)
      );
    } finally {
      mockLocalStorage.getItem = originalGetItem;
    }
  });

  it("reports write failure when localStorage.setItem throws (quota exceeded)", () => {
    const originalSetItem = mockLocalStorage.setItem;
    mockLocalStorage.setItem = vi.fn(() => {
      throw new Error("QuotaExceededError");
    });

    try {
      render(<PwaUpdateNotifier />);

      expect(mockHandleLocalDbWriteFailed).toHaveBeenCalledWith(
        COMMIT_HASH_LSK,
        expect.any(Error)
      );
    } finally {
      mockLocalStorage.setItem = originalSetItem;
    }
  });
});
