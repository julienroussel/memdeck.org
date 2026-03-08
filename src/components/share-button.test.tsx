import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "../test-utils";
import { ShareButton } from "./share-button";

const mockShareMemDeck = vi.fn();
vi.mock("../utils/share", () => ({
  shareMemDeck: (...args: unknown[]) => mockShareMemDeck(...args),
}));

const mockTrackShareClicked = vi.fn();
vi.mock("../services/analytics", () => ({
  analytics: {
    trackShareClicked: (...args: unknown[]) => mockTrackShareClicked(...args),
  },
}));

const getShareIcon = () => document.querySelector(".tabler-icon-share");

const getCheckIcon = () => document.querySelector(".tabler-icon-check");

beforeEach(() => {
  mockShareMemDeck.mockReset();
  mockTrackShareClicked.mockReset();
  mockShareMemDeck.mockResolvedValue("shared");
});

describe("ShareButton", () => {
  it("calls shareMemDeck on click and tracks analytics with source nav", async () => {
    const user = userEvent.setup();
    render(<ShareButton />);

    await user.click(screen.getByRole("button", { name: "Share MemDeck" }));

    expect(mockShareMemDeck).toHaveBeenCalledOnce();
    expect(mockTrackShareClicked).toHaveBeenCalledWith("nav", "shared");
  });

  it("shows check icon temporarily when share result is copied", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockShareMemDeck.mockResolvedValue("copied");
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ShareButton />);

    expect(getShareIcon()).toBeInTheDocument();
    expect(getCheckIcon()).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Share MemDeck" }));

    await waitFor(() => {
      expect(getCheckIcon()).toBeInTheDocument();
    });
    expect(getShareIcon()).not.toBeInTheDocument();

    vi.advanceTimersByTime(2000);

    await waitFor(() => {
      expect(getShareIcon()).toBeInTheDocument();
    });
    expect(getCheckIcon()).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it("does not show check icon for shared result", async () => {
    mockShareMemDeck.mockResolvedValue("shared");
    const user = userEvent.setup();
    render(<ShareButton />);

    await user.click(screen.getByRole("button", { name: "Share MemDeck" }));

    await waitFor(() => {
      expect(mockTrackShareClicked).toHaveBeenCalledWith("nav", "shared");
    });

    expect(getCheckIcon()).not.toBeInTheDocument();
    expect(getShareIcon()).toBeInTheDocument();
  });

  it("renders correctly with variant default", async () => {
    const user = userEvent.setup();
    render(<ShareButton variant="default" />);

    const button = screen.getByRole("button", { name: "Share MemDeck" });
    expect(button).toBeInTheDocument();
    expect(getShareIcon()).toBeInTheDocument();

    await user.click(button);

    await waitFor(() => {
      expect(mockShareMemDeck).toHaveBeenCalledOnce();
    });
  });

  it("does not show check icon for failed result", async () => {
    mockShareMemDeck.mockResolvedValue("failed");
    const user = userEvent.setup();
    render(<ShareButton />);

    await user.click(screen.getByRole("button", { name: "Share MemDeck" }));

    await waitFor(() => {
      expect(mockTrackShareClicked).toHaveBeenCalledWith("nav", "failed");
    });

    expect(getCheckIcon()).not.toBeInTheDocument();
    expect(getShareIcon()).toBeInTheDocument();
  });
});
