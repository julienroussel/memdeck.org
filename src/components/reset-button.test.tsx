import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ALL_TIME_STATS_LSK, SESSION_HISTORY_LSK } from "../constants";
import { render } from "../test-utils";
import { ResetButton, resetApp, resetSettings } from "./reset-button";

const getResetButton = () => screen.getByRole("button", { name: "Reset app" });

describe("ResetButton", () => {
  it("renders the reset button", () => {
    render(<ResetButton />);
    expect(getResetButton()).toBeInTheDocument();
  });

  it("opens a modal with two reset options on click", async () => {
    const user = userEvent.setup();
    render(<ResetButton />);

    await user.click(getResetButton());

    expect(
      screen.getByText("Reset app", { selector: ".mantine-Modal-title" })
    ).toBeInTheDocument();
    expect(
      screen.getByText("Choose what to reset. This cannot be undone.")
    ).toBeInTheDocument();
    expect(screen.getByText("Reset settings")).toBeInTheDocument();
    expect(screen.getByText("Reset everything")).toBeInTheDocument();
  });

  describe("with mocked globals", () => {
    const removeItemMock = vi.fn();
    const reloadMock = vi.fn();
    const clearMock = vi.fn();
    const keyMock = vi.fn();

    beforeEach(() => {
      vi.stubGlobal("localStorage", {
        clear: clearMock,
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: removeItemMock,
        length: 0,
        key: keyMock,
      });
      Object.defineProperty(window, "location", {
        value: { reload: reloadMock },
        writable: true,
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    });

    it("calls resetApp when 'Reset everything' is clicked", async () => {
      const user = userEvent.setup();
      render(<ResetButton />);
      await user.click(getResetButton());
      await user.click(screen.getByText("Reset everything"));
      await waitFor(() => {
        expect(clearMock).toHaveBeenCalled();
      });
      expect(reloadMock).toHaveBeenCalled();
    });

    it("calls resetSettings when 'Reset settings' is clicked", async () => {
      const user = userEvent.setup();
      render(<ResetButton />);
      await user.click(getResetButton());
      await user.click(screen.getByText("Reset settings"));
      await waitFor(() => {
        expect(reloadMock).toHaveBeenCalled();
      });
    });

    it("closes the modal when 'Reset everything' is clicked", async () => {
      const user = userEvent.setup();
      render(<ResetButton />);
      await user.click(getResetButton());
      expect(
        screen.getByText("Choose what to reset. This cannot be undone.")
      ).toBeInTheDocument();
      await user.click(screen.getByText("Reset everything"));
      await waitFor(() => {
        expect(
          screen.queryByText("Choose what to reset. This cannot be undone.")
        ).not.toBeInTheDocument();
      });
    });
  });

  it("closes the modal when cancel is clicked", async () => {
    const user = userEvent.setup();
    render(<ResetButton />);

    await user.click(getResetButton());
    expect(
      screen.getByText("Choose what to reset. This cannot be undone.")
    ).toBeInTheDocument();

    await user.click(screen.getByText("Cancel"));
    await waitFor(() => {
      expect(
        screen.queryByText("Choose what to reset. This cannot be undone.")
      ).not.toBeInTheDocument();
    });
  });
});

describe("resetSettings", () => {
  const removeItemMock = vi.fn();
  const reloadMock = vi.fn();
  const keyMock = vi.fn();

  beforeEach(() => {
    keyMock
      .mockReturnValueOnce("memdeck-app-stack")
      .mockReturnValueOnce(SESSION_HISTORY_LSK)
      .mockReturnValueOnce(ALL_TIME_STATS_LSK)
      .mockReturnValueOnce("memdeck-app-flashcard-option")
      .mockReturnValueOnce(null);

    vi.stubGlobal("localStorage", {
      clear: vi.fn(),
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: removeItemMock,
      length: 4,
      key: keyMock,
    });
    Object.defineProperty(window, "location", {
      value: { reload: reloadMock },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("removes non-stats keys from localStorage", async () => {
    await resetSettings();
    expect(removeItemMock).toHaveBeenCalledWith("memdeck-app-stack");
    expect(removeItemMock).toHaveBeenCalledWith("memdeck-app-flashcard-option");
  });

  it("preserves stats keys", async () => {
    await resetSettings();
    expect(removeItemMock).not.toHaveBeenCalledWith(SESSION_HISTORY_LSK);
    expect(removeItemMock).not.toHaveBeenCalledWith(ALL_TIME_STATS_LSK);
  });

  it("reloads the page", async () => {
    await resetSettings();
    expect(reloadMock).toHaveBeenCalled();
  });
});

describe("resetApp", () => {
  const clearMock = vi.fn();
  const reloadMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      clear: clearMock,
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      length: 0,
      key: vi.fn(),
    });
    Object.defineProperty(window, "location", {
      value: { reload: reloadMock },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("clears localStorage", async () => {
    await resetApp();
    expect(clearMock).toHaveBeenCalled();
  });

  it("reloads the page", async () => {
    await resetApp();
    expect(reloadMock).toHaveBeenCalled();
  });

  it("unregisters service workers", async () => {
    const unregisterMock = vi.fn().mockResolvedValue(true);
    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        getRegistrations: vi
          .fn()
          .mockResolvedValue([{ unregister: unregisterMock }]),
      },
      configurable: true,
    });

    await resetApp();
    expect(unregisterMock).toHaveBeenCalled();
  });

  it("clears cache storage", async () => {
    const deleteMock = vi.fn().mockResolvedValue(true);
    vi.stubGlobal("caches", {
      keys: vi.fn().mockResolvedValue(["cache-v1"]),
      delete: deleteMock,
    });

    await resetApp();
    expect(deleteMock).toHaveBeenCalledWith("cache-v1");
  });

  it("clears all cache storage entries when multiple caches exist", async () => {
    const deleteMock = vi.fn().mockResolvedValue(true);
    vi.stubGlobal("caches", {
      keys: vi.fn().mockResolvedValue(["cache-v1", "cache-v2"]),
      delete: deleteMock,
    });

    await resetApp();
    expect(deleteMock).toHaveBeenCalledWith("cache-v1");
    expect(deleteMock).toHaveBeenCalledWith("cache-v2");
    expect(deleteMock).toHaveBeenCalledTimes(2);
  });

  it("does not throw when service worker API is unavailable", async () => {
    Object.defineProperty(navigator, "serviceWorker", {
      value: undefined,
      configurable: true,
    });

    await expect(resetApp()).resolves.toBeUndefined();
  });

  it("does not throw when cache API is unavailable", async () => {
    vi.stubGlobal("caches", undefined);
    await expect(resetApp()).resolves.toBeUndefined();
  });
});
