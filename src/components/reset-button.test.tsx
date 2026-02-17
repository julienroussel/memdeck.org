import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "../test-utils";
import { ResetButton, resetApp } from "./reset-button";

describe("ResetButton", () => {
  it("renders the reset button", () => {
    render(<ResetButton />);
    expect(screen.getByText("Reset app")).toBeInTheDocument();
  });

  it("opens a confirmation modal on click", async () => {
    const user = userEvent.setup();
    render(<ResetButton />);

    await user.click(screen.getByText("Reset app"));

    expect(screen.getByText("Reset all data?")).toBeInTheDocument();
    expect(
      screen.getByText(
        "This will erase all your training history, statistics, and preferences. This cannot be undone."
      )
    ).toBeInTheDocument();
  });

  describe("with mocked globals", () => {
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

    it("calls resetApp when confirm button is clicked", async () => {
      const user = userEvent.setup();
      render(<ResetButton />);
      await user.click(screen.getByText("Reset app"));
      await user.click(screen.getByText("Reset everything"));
      await waitFor(() => {
        expect(clearMock).toHaveBeenCalled();
      });
      expect(reloadMock).toHaveBeenCalled();
    });

    it("closes the modal when confirm is clicked", async () => {
      const user = userEvent.setup();
      render(<ResetButton />);
      await user.click(screen.getByText("Reset app"));
      expect(screen.getByText("Reset all data?")).toBeInTheDocument();
      await user.click(screen.getByText("Reset everything"));
      await waitFor(() => {
        expect(screen.queryByText("Reset all data?")).not.toBeInTheDocument();
      });
    });
  });

  it("closes the modal when cancel is clicked", async () => {
    const user = userEvent.setup();
    render(<ResetButton />);

    await user.click(screen.getByText("Reset app"));
    expect(screen.getByText("Reset all data?")).toBeInTheDocument();

    await user.click(screen.getByText("Cancel"));
    await waitFor(() => {
      expect(screen.queryByText("Reset all data?")).not.toBeInTheDocument();
    });
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
