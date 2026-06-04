import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DISCOVERY_SNOOZE_SESSIONS, FEATURE_DISCOVERY_LSK } from "../constants";
import { createGatedSetterMock } from "../test-utils/mock-local-db-setter";
import type { FeatureDiscoveryState } from "../types/discovery";
import type { FlashcardMode } from "../types/flashcard";
import type { SessionRecord } from "../types/session";
import type { SpotCheckMode } from "../types/spot-check";
import { useFeatureDiscovery } from "./use-feature-discovery";

// --- Session-record builders ------------------------------------------------

type BaseFields = Omit<Extract<SessionRecord, { mode: "acaan" }>, "mode">;

const base = (id: string): BaseFields => ({
  id,
  stackKey: "mnemonica",
  config: { type: "open" },
  startedAt: "2026-01-01T00:00:00.000Z",
  endedAt: "2026-01-01T00:05:00.000Z",
  durationSeconds: 300,
  successes: 8,
  fails: 2,
  questionsCompleted: 10,
  accuracy: 0.8,
  bestStreak: 5,
});

const flashcard = (
  id: string,
  flashcardMode?: FlashcardMode
): SessionRecord => ({
  ...base(id),
  mode: "flashcard",
  flashcardMode,
});

const spotcheck = (
  id: string,
  spotCheckMode?: SpotCheckMode
): SessionRecord => ({
  ...base(id),
  mode: "spotcheck",
  spotCheckMode,
});

const distance = (id: string): SessionRecord => ({
  ...base(id),
  mode: "distance",
  distanceMode: "compute",
  distanceConvention: "cyclic",
});

const acaan = (id: string): SessionRecord => ({ ...base(id), mode: "acaan" });

// --- Mocks ------------------------------------------------------------------

let mockHistory: SessionRecord[] = [];
vi.mock("./use-session-history", () => ({
  useSessionHistory: () => ({ history: mockHistory }),
}));

const mockGetGlobalStats = vi.fn();
vi.mock("./use-all-time-stats", () => ({
  useAllTimeStats: () => ({ getGlobalStats: mockGetGlobalStats }),
}));

const mockTrackAccepted = vi.fn();
const mockTrackDismissed = vi.fn();
vi.mock("../services/analytics", () => ({
  analytics: {
    trackFeatureSuggestionAccepted: (...args: unknown[]) =>
      mockTrackAccepted(...args),
    trackFeatureSuggestionDismissed: (...args: unknown[]) =>
      mockTrackDismissed(...args),
  },
}));

vi.mock("../utils/localstorage-telemetry", () => ({
  handleLocalDbWriteFailed: vi.fn(),
  reportLocalDbCorruption: vi.fn(),
}));

let discoveryState: FeatureDiscoveryState = { dismissed: [], snoozedUntil: 0 };
let shareDismissed = false;
let setterSucceeds = true;
// Typed with `unknown` so the mock setter is assignable to `useLocalDb`'s
// `UseLocalDbSetter<unknown>` slot, and so a recorded updater argument narrows
// to a callable via `typeof === "function"`.
const mockSetState = createGatedSetterMock<unknown>(() => setterSucceeds);

vi.mock("../utils/localstorage", () => ({ useLocalDb: vi.fn() }));
const { useLocalDb } = await import("../utils/localstorage");
const mockedUseLocalDb = vi.mocked(useLocalDb);

const stats = (totalSessions: number) => ({
  totalSessions,
  totalQuestions: 0,
  totalSuccesses: 0,
  totalFails: 0,
  globalBestStreak: 0,
});

beforeEach(() => {
  mockHistory = [flashcard("1", "cardonly")];
  discoveryState = { dismissed: [], snoozedUntil: 0 };
  shareDismissed = false;
  setterSucceeds = true;
  mockTrackAccepted.mockReset();
  mockTrackDismissed.mockReset();
  mockSetState.mockClear();
  // 4 sessions: ≥ DISCOVERY_MIN_SESSIONS (3) but < SHARE_NUDGE_MIN_SESSIONS (5),
  // so discovery is eligible and the share nudge is not pending.
  mockGetGlobalStats.mockReturnValue(stats(4));
  mockedUseLocalDb.mockImplementation((key) =>
    key === FEATURE_DISCOVERY_LSK
      ? [discoveryState, mockSetState, vi.fn()]
      : [shareDismissed, vi.fn(), vi.fn()]
  );
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("useFeatureDiscovery", () => {
  it("returns null below the minimum session count", () => {
    mockGetGlobalStats.mockReturnValue(stats(2));

    const { result } = renderHook(() => useFeatureDiscovery());

    expect(result.current.nextSuggestion).toBeNull();
  });

  it("suggests the highest-priority untried whole mode for a flashcard-only user", () => {
    const { result } = renderHook(() => useFeatureDiscovery());

    expect(result.current.nextSuggestion?.id).toBe("mode-spotcheck");
  });

  it("prioritizes a variant of the most-used mode once whole modes are tried", () => {
    // Distance is the most-used mode; all whole modes have been tried.
    mockHistory = [
      flashcard("1", "cardonly"),
      spotcheck("2", "missing"),
      acaan("3"),
      distance("4"),
      distance("5"),
      distance("6"),
    ];

    const { result } = renderHook(() => useFeatureDiscovery());

    expect(result.current.nextSuggestion?.id).toBe("distance-apply");
  });

  it("suppresses suggestions while snoozed and resumes afterward", () => {
    discoveryState = { dismissed: [], snoozedUntil: 6 };
    const snoozed = renderHook(() => useFeatureDiscovery());
    expect(snoozed.result.current.nextSuggestion).toBeNull();

    discoveryState = { dismissed: [], snoozedUntil: 4 };
    const resumed = renderHook(() => useFeatureDiscovery());
    expect(resumed.result.current.nextSuggestion).not.toBeNull();
  });

  it("never resurfaces a retired suggestion", () => {
    discoveryState = { dismissed: ["mode-spotcheck"], snoozedUntil: 0 };

    const { result } = renderHook(() => useFeatureDiscovery());

    expect(result.current.nextSuggestion?.id).toBe("mode-distance");
  });

  it("stays silent while the share nudge is pending", () => {
    mockGetGlobalStats.mockReturnValue(stats(5));
    shareDismissed = false;

    const { result } = renderHook(() => useFeatureDiscovery());

    expect(result.current.nextSuggestion).toBeNull();
  });

  it("surfaces a suggestion once the share nudge is dismissed at its threshold", () => {
    mockGetGlobalStats.mockReturnValue(stats(5));
    shareDismissed = true;

    const { result } = renderHook(() => useFeatureDiscovery());

    expect(result.current.nextSuggestion).not.toBeNull();
  });

  it("returns null when every suggestion has been retired", () => {
    discoveryState = {
      dismissed: [
        "mode-spotcheck",
        "mode-distance",
        "mode-acaan",
        "flashcard-numberonly",
        "flashcard-neighbor",
        "spotcheck-swapped",
        "spotcheck-moved",
        "distance-apply",
        "distance-signed",
      ],
      snoozedUntil: 0,
    };

    const { result } = renderHook(() => useFeatureDiscovery());

    expect(result.current.nextSuggestion).toBeNull();
  });

  it("orders by catalog index when there is no most-used mode", () => {
    // history (session-history) and totalSessions (all-time-stats) are separate
    // stores; an empty history with a non-zero session count leaves
    // mostUsedMode null, so the comparator must fall through to catalog order
    // without throwing on the null comparison.
    mockHistory = [];

    const { result } = renderHook(() => useFeatureDiscovery());

    expect(result.current.nextSuggestion?.id).toBe("mode-spotcheck");
  });

  it("does not duplicate an already-retired id when accepting again", () => {
    const { result } = renderHook(() => useFeatureDiscovery());

    act(() => {
      result.current.accept("mode-spotcheck", "home");
    });

    const updater = mockSetState.mock.calls[0]?.[0];
    if (typeof updater !== "function") {
      throw new Error("expected an updater function");
    }
    expect(updater({ dismissed: ["mode-spotcheck"], snoozedUntil: 0 })).toEqual(
      {
        dismissed: ["mode-spotcheck"],
        snoozedUntil: 0,
      }
    );
  });

  it("retires the suggestion and tracks acceptance on a successful write", () => {
    const { result } = renderHook(() => useFeatureDiscovery());

    act(() => {
      result.current.accept("mode-spotcheck", "home");
    });

    expect(mockSetState).toHaveBeenCalledWith(expect.any(Function), {
      onSuccess: expect.any(Function),
    });
    const updater = mockSetState.mock.calls[0]?.[0];
    if (typeof updater !== "function") {
      throw new Error("expected an updater function");
    }
    expect(updater({ dismissed: [], snoozedUntil: 0 })).toEqual({
      dismissed: ["mode-spotcheck"],
      snoozedUntil: 0,
    });
    expect(mockTrackAccepted).toHaveBeenCalledWith("mode-spotcheck", "home");
  });

  it("snoozes the surface and tracks dismissal", () => {
    const { result } = renderHook(() => useFeatureDiscovery());

    act(() => {
      result.current.dismiss("mode-spotcheck", "home");
    });

    const updater = mockSetState.mock.calls[0]?.[0];
    if (typeof updater !== "function") {
      throw new Error("expected an updater function");
    }
    expect(updater({ dismissed: [], snoozedUntil: 0 })).toEqual({
      dismissed: ["mode-spotcheck"],
      snoozedUntil: 4 + DISCOVERY_SNOOZE_SESSIONS,
    });
    expect(mockTrackDismissed).toHaveBeenCalledWith("mode-spotcheck", "home");
  });

  it("does not duplicate an already-retired id when dismissing again", () => {
    const { result } = renderHook(() => useFeatureDiscovery());

    act(() => {
      result.current.dismiss("mode-spotcheck", "home");
    });

    const updater = mockSetState.mock.calls[0]?.[0];
    if (typeof updater !== "function") {
      throw new Error("expected an updater function");
    }
    // Re-running over a state that already holds the id keeps a single entry
    // but still refreshes the snooze gate.
    expect(updater({ dismissed: ["mode-spotcheck"], snoozedUntil: 0 })).toEqual(
      {
        dismissed: ["mode-spotcheck"],
        snoozedUntil: 4 + DISCOVERY_SNOOZE_SESSIONS,
      }
    );
  });

  it("does not track analytics when the write fails", () => {
    setterSucceeds = false;
    const { result } = renderHook(() => useFeatureDiscovery());

    act(() => {
      result.current.accept("mode-spotcheck", "home");
    });

    expect(mockSetState).toHaveBeenCalledTimes(1);
    expect(mockTrackAccepted).not.toHaveBeenCalled();
  });

  it("does not track dismissal analytics when the write fails", () => {
    setterSucceeds = false;
    const { result } = renderHook(() => useFeatureDiscovery());

    act(() => {
      result.current.dismiss("mode-spotcheck", "home");
    });

    expect(mockSetState).toHaveBeenCalledTimes(1);
    expect(mockTrackDismissed).not.toHaveBeenCalled();
  });

  it("reports exploredCount over the catalog and a fixed totalCount", () => {
    mockHistory = [flashcard("1", "neighbor"), spotcheck("2", "swapped")];

    const { result } = renderHook(() => useFeatureDiscovery());

    // Used catalog items: mode-spotcheck, flashcard-neighbor, spotcheck-swapped.
    expect(result.current.exploredCount).toBe(3);
    expect(result.current.totalCount).toBe(9);
  });
});
