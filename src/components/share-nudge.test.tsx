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

// `useLocalDb` is mocked to invoke `options.onSuccess` synchronously so the
// analytics callback wired through `handleDismiss` runs — mirrors the pattern
// in `use-timer-settings.test.ts` (`setSettingsSucceeding`). Per-test
// overrides via `mockReturnValueOnce` simulate the "previously dismissed"
// branch.
const mockSetDismissed = vi.fn(
  (_value: unknown, opts?: { onSuccess?: () => void }) => {
    opts?.onSuccess?.();
  }
);
vi.mock("../utils/localstorage", () => ({
  useLocalDb: vi.fn((_key, defaultValue: boolean) => [
    defaultValue,
    mockSetDismissed,
    vi.fn(),
  ]),
}));
const { useLocalDb } = await import("../utils/localstorage");
const mockedUseLocalDb = vi.mocked(useLocalDb);

vi.mock("../utils/localstorage-telemetry", () => ({
  handleLocalDbWriteFailed: vi.fn(),
  reportLocalDbCorruption: vi.fn(),
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
  averageAccuracy: 0.91,
  bestAccuracy: 1,
  totalCards: 55,
  totalCorrect: 50,
  totalIncorrect: 5,
  totalSessions: 10,
};

beforeEach(() => {
  mockGetGlobalStats.mockReset();
  mockShareMemDeck.mockReset();
  mockTrackShareClicked.mockReset();
  mockTrackShareNudgeDismissed.mockReset();
  mockSetDismissed.mockClear();
  // Reset the default `useLocalDb` mock implementation so per-test
  // `mockReturnValueOnce` overrides apply to only one render.
  mockedUseLocalDb.mockImplementation((_key, defaultValue) => [
    defaultValue as boolean,
    mockSetDismissed,
    vi.fn(),
  ]);

  mockGetGlobalStats.mockReturnValue(defaultStats);
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
    mockedUseLocalDb.mockReturnValueOnce([true, mockSetDismissed, vi.fn()]);

    render(<ShareNudge />);
    expect(screen.queryByText(NUDGE_TEXT)).not.toBeInTheDocument();
  });

  it("persists dismissal and tracks analytics when dismiss is clicked", async () => {
    const user = userEvent.setup();
    render(<ShareNudge />);

    expect(screen.getByText(NUDGE_TEXT)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(mockSetDismissed).toHaveBeenCalledWith(true, {
      onSuccess: expect.any(Function),
    });
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
    expect(mockSetDismissed).toHaveBeenCalledWith(true, {
      onSuccess: expect.any(Function),
    });
    expect(mockTrackShareNudgeDismissed).toHaveBeenCalledOnce();
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
    expect(mockSetDismissed).toHaveBeenCalledWith(true, {
      onSuccess: expect.any(Function),
    });
    expect(mockTrackShareNudgeDismissed).toHaveBeenCalledOnce();
  });
});
