import { notifications } from "@mantine/notifications";
import { fireEvent, render } from "@testing-library/react";
import { isValidElement } from "react";
import type { RegisterSWOptions } from "vite-plugin-pwa/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PwaUpdateNotifier } from "./pwa-update-notifier";

const mockUpdateServiceWorker = vi.fn();
let needRefreshState: [boolean, ReturnType<typeof vi.fn>] = [false, vi.fn()];

const mockUseRegisterSW = vi.fn((_options?: RegisterSWOptions) => ({
  needRefresh: needRefreshState,
  updateServiceWorker: mockUpdateServiceWorker,
}));

vi.mock("virtual:pwa-register/react", () => ({
  useRegisterSW: (options?: RegisterSWOptions) => mockUseRegisterSW(options),
}));

vi.mock("@mantine/notifications", () => ({
  notifications: { show: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
  needRefreshState = [false, vi.fn()];
  mockUseRegisterSW.mockImplementation(() => ({
    needRefresh: needRefreshState,
    updateServiceWorker: mockUpdateServiceWorker,
  }));
});

describe("PwaUpdateNotifier", () => {
  it("renders nothing", () => {
    const { container } = render(<PwaUpdateNotifier />);
    expect(container.innerHTML).toBe("");
  });

  it("does not show a notification when needRefresh is false", () => {
    render(<PwaUpdateNotifier />);
    expect(notifications.show).not.toHaveBeenCalled();
  });

  it("shows a notification when needRefresh is true", () => {
    needRefreshState = [true, vi.fn()];
    render(<PwaUpdateNotifier />);

    expect(notifications.show).toHaveBeenCalledOnce();
    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        autoClose: false,
        color: "blue",
        title: "Update Available",
        message: expect.anything(),
        withCloseButton: true,
      })
    );
  });

  it("shows a notification when needRefresh transitions from false to true", () => {
    needRefreshState = [false, vi.fn()];
    const { rerender } = render(<PwaUpdateNotifier />);
    expect(notifications.show).not.toHaveBeenCalled();

    needRefreshState = [true, vi.fn()];
    mockUseRegisterSW.mockImplementation(() => ({
      needRefresh: needRefreshState,
      updateServiceWorker: mockUpdateServiceWorker,
    }));
    rerender(<PwaUpdateNotifier />);

    expect(notifications.show).toHaveBeenCalledOnce();
  });

  it("does not show duplicate notifications on re-render", () => {
    needRefreshState = [true, vi.fn()];
    const { rerender } = render(<PwaUpdateNotifier />);

    expect(notifications.show).toHaveBeenCalledOnce();

    rerender(<PwaUpdateNotifier />);

    expect(notifications.show).toHaveBeenCalledOnce();
  });

  it("calls updateServiceWorker when the reload button is clicked", () => {
    needRefreshState = [true, vi.fn()];
    render(<PwaUpdateNotifier />);

    const call = vi.mocked(notifications.show).mock.calls[0][0];
    const message = call.message;
    if (!isValidElement(message)) {
      throw new Error("Expected ReactElement");
    }
    const { getByRole } = render(message);
    fireEvent.click(getByRole("button"));

    expect(mockUpdateServiceWorker).toHaveBeenCalledWith(true);
  });

  it("registers the service worker with immediate option", () => {
    render(<PwaUpdateNotifier />);
    expect(mockUseRegisterSW).toHaveBeenCalledWith({ immediate: true });
  });
});
