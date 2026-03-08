import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "../test-utils";
import { ShareNudge } from "./share-nudge";

const mockGetGlobalStats = vi.fn();

vi.mock("../hooks/use-all-time-stats", () => ({
  useAllTimeStats: () => ({
    getGlobalStats: mockGetGlobalStats,
  }),
}));

const mockGetStoredValue = vi.fn();
vi.mock("../utils/localstorage", () => ({
  getStoredValue: (...args: unknown[]) => mockGetStoredValue(...args),
}));

const mockShareMemDeck = vi.fn();
vi.mock("../utils/share", () => ({
  shareMemDeck: (...args: unknown[]) => mockShareMemDeck(...args),
}));

const mockTrackShareClicked = vi.fn();
const mockTrackShareNudgeDismissed = vi.fn();
vi.mock("../services/analytics", () => ({
  analytics: {
    trackShareClicked: (...args: unknown[]) => mockTrackShareClicked(...args),
    trackShareNudgeDismissed: () => mockTrackShareNudgeDismissed(),
  },
}));

const defaultStats = {
  totalSessions: 10,
  totalCorrect: 50,
  totalIncorrect: 5,
  totalCards: 55,
  averageAccuracy: 0.91,
  bestAccuracy: 1,
};

const setItemMock = vi.fn();

beforeEach(() => {
  mockGetStoredValue.mockReset();
  mockGetGlobalStats.mockReset();
  mockShareMemDeck.mockReset();
  mockTrackShareClicked.mockReset();
  mockTrackShareNudgeDismissed.mockReset();
  setItemMock.mockReset();

  mockGetStoredValue.mockReturnValue(false);
  mockGetGlobalStats.mockReturnValue(defaultStats);

  vi.stubGlobal("localStorage", {
    getItem: vi.fn(),
    setItem: setItemMock,
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const NUDGE_TEXT = "Enjoying MemDeck? Share it with a fellow magician.";

describe("ShareNudge", () => {
  it("renders nothing when totalSessions is below the minimum threshold", () => {
    mockGetGlobalStats.mockReturnValue({
      ...defaultStats,
      totalSessions: 3,
    });

    render(<ShareNudge />);
    expect(screen.queryByText(NUDGE_TEXT)).not.toBeInTheDocument();
  });

  it("renders the nudge message when session threshold is met and not dismissed", () => {
    render(<ShareNudge />);
    expect(screen.getByText(NUDGE_TEXT)).toBeInTheDocument();
  });

  it("renders nothing when previously dismissed via localStorage", () => {
    mockGetStoredValue.mockReturnValue(true);

    render(<ShareNudge />);
    expect(screen.queryByText(NUDGE_TEXT)).not.toBeInTheDocument();
  });

  it("hides the component and persists to localStorage when dismiss is clicked", async () => {
    const user = userEvent.setup();
    render(<ShareNudge />);

    expect(screen.getByText(NUDGE_TEXT)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(screen.queryByText(NUDGE_TEXT)).not.toBeInTheDocument();
    expect(setItemMock).toHaveBeenCalledWith(
      "memdeck-app-share-nudge-dismissed",
      "true"
    );
    expect(mockTrackShareNudgeDismissed).toHaveBeenCalledOnce();
  });

  it("dismisses nudge even when share fails", async () => {
    mockShareMemDeck.mockResolvedValue("failed");
    const user = userEvent.setup();
    render(<ShareNudge />);

    await user.click(screen.getByRole("button", { name: "Share MemDeck" }));

    await waitFor(() => {
      expect(mockShareMemDeck).toHaveBeenCalledOnce();
    });
    expect(mockTrackShareClicked).toHaveBeenCalledWith("nudge", "failed");
    expect(mockTrackShareNudgeDismissed).toHaveBeenCalledOnce();
    expect(screen.queryByText(NUDGE_TEXT)).not.toBeInTheDocument();
  });

  it("calls shareMemDeck, tracks analytics, then dismisses when share is clicked", async () => {
    mockShareMemDeck.mockResolvedValue("shared");
    const user = userEvent.setup();
    render(<ShareNudge />);

    await user.click(screen.getByRole("button", { name: "Share MemDeck" }));

    await waitFor(() => {
      expect(mockShareMemDeck).toHaveBeenCalledOnce();
    });
    expect(mockTrackShareClicked).toHaveBeenCalledWith("nudge", "shared");
    expect(mockTrackShareNudgeDismissed).toHaveBeenCalledOnce();
    expect(screen.queryByText(NUDGE_TEXT)).not.toBeInTheDocument();
  });
});
