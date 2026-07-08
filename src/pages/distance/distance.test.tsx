import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "../../test-utils";
import { createDeckPosition, stacks } from "../../types/stacks";

// Mock the timer hook so we can capture the options it was invoked with.
type CapturedTimerOpts = {
  timerSettings: { enabled: boolean; duration: number };
  timeRemaining: number;
};
let capturedTimerCalls: CapturedTimerOpts[] = [];

vi.mock("../../hooks/use-game-timer", () => ({
  timerReducerCases: {
    RESET_TIMER: (
      s: { timeRemaining: number; timerDuration: number },
      duration: number
    ) => ({ ...s, timeRemaining: duration, timerDuration: duration }),
    TICK: (s: { timeRemaining: number }) => ({
      ...s,
      timeRemaining: Math.max(0, s.timeRemaining - 1),
    }),
  },
  useGameTimer: vi.fn((opts: CapturedTimerOpts) => {
    capturedTimerCalls.push(opts);
  }),
}));

vi.mock("@mantine/notifications", () => ({
  notifications: { show: vi.fn() },
}));

vi.mock("../../services/event-bus", () => ({
  eventBus: {
    emit: {
      DISTANCE_ANSWER: vi.fn(),
      DISTANCE_CONVENTION_CHANGED: vi.fn(),
      DISTANCE_MODE_CHANGED: vi.fn(),
    },
  },
}));

vi.mock("../../services/analytics", () => ({
  analytics: {
    trackEvent: vi.fn(),
    trackFeatureUsed: vi.fn(),
  },
}));

vi.mock("../../hooks/use-document-meta", () => ({
  useDocumentMeta: vi.fn(),
}));

vi.mock("../../hooks/use-selected-stack", () => ({
  useRequiredStack: () => ({
    stack: stacks.mnemonica,
    stackKey: "mnemonica",
    stackName: stacks.mnemonica.name,
    stackOrder: stacks.mnemonica.order,
  }),
}));

const RANGE_TOO_SMALL_REGEX = /range too small/i;

// Range that is < MIN_DISTANCE_RANGE so the page disables the timer.
const tooSmallLimits = {
  end: createDeckPosition(3),
  start: createDeckPosition(1),
};

// Range that is well above MIN_DISTANCE_RANGE so the page mounts the
// active round and prompt UI.
const validLimits = {
  end: createDeckPosition(20),
  start: createDeckPosition(1),
};

type StackLimitsResult = {
  limits: typeof tooSmallLimits;
  setLimits: ReturnType<typeof vi.fn>;
  rangeSize: number;
  isFullDeck: boolean;
};

const mockUseStackLimits = vi.fn<() => StackLimitsResult>();

vi.mock("../../hooks/use-stack-limits", () => ({
  useStackLimits: () => mockUseStackLimits(),
}));

vi.mock("./use-distance-settings", () => ({
  useDistanceSettings: () => ({
    convention: "cyclic",
    handleConventionChange: vi.fn(),
    handleModeChange: vi.fn(),
    handleTimerEnabledChange: vi.fn(),
    // The user has the timer enabled in settings — the page must override
    // it because the range is too small to play.
    mode: "compute",
    setTimerDuration: vi.fn(),
    timerSettings: { duration: 15, enabled: true },
  }),
}));

vi.mock("../../hooks/use-session", () => ({
  useSession: () => ({
    activeSession: null,
    dismissSummary: vi.fn(),
    handleAnswer: vi.fn(),
    isStructuredSession: false,
    startNewSession: vi.fn(),
    startSession: vi.fn(),
    status: { phase: "idle" },
    stopSession: vi.fn(),
  }),
}));

// Stub the heavy children so the test only exercises the Distance page logic.
vi.mock("../../components/training-header", () => ({
  TrainingHeader: () => null,
}));
vi.mock("../../components/session-summary-modal", () => ({
  SessionSummaryModal: () => null,
}));
vi.mock("../../components/reveal-button", () => ({
  RevealButton: () => null,
}));
vi.mock("../../components/json-ld", () => ({
  buildBreadcrumbSchema: () => ({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [],
  }),
  JsonLd: () => null,
}));

beforeEach(() => {
  capturedTimerCalls = [];
  // Default to the too-small range; happy-path test overrides per-case.
  mockUseStackLimits.mockReturnValue({
    isFullDeck: false,
    limits: tooSmallLimits,
    rangeSize: 3,
    setLimits: vi.fn(),
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("Distance — effectiveTimerSettings", () => {
  it("invokes useGameTimer with enabled=false when rangeSize < MIN_DISTANCE_RANGE, even if user has the timer enabled", async () => {
    // Lazy import after mocks are set up.
    const { Distance } = await import("./distance");
    render(<Distance />);

    expect(capturedTimerCalls.length).toBeGreaterThan(0);
    // Every invocation across renders must reflect the override.
    for (const call of capturedTimerCalls) {
      expect(call.timerSettings.enabled).toBe(false);
    }
  });

  it("renders the rangeTooSmall alert and does NOT mount the active round prompt", async () => {
    const { Distance } = await import("./distance");
    render(<Distance />);

    // The DistanceRangeTooSmallAlert renders the i18n title text.
    expect(screen.getByText(RANGE_TOO_SMALL_REGEX)).toBeInTheDocument();
    // The DistancePromptDisplay (mounted by DistanceActiveRound) sets
    // data-testid="distance-prompt-card" — must NOT be present.
    expect(
      screen.queryByTestId("distance-prompt-card")
    ).not.toBeInTheDocument();
  });
});

describe("Distance — happy path with a valid range", () => {
  it("mounts DistanceActiveRound (prompt card visible) and does NOT render the rangeTooSmall alert", async () => {
    mockUseStackLimits.mockReturnValue({
      isFullDeck: false,
      limits: validLimits,
      rangeSize: 20,
      setLimits: vi.fn(),
    });
    const { Distance } = await import("./distance");
    render(<Distance />);

    expect(screen.getByTestId("distance-prompt-card")).toBeInTheDocument();
    expect(screen.queryByText(RANGE_TOO_SMALL_REGEX)).not.toBeInTheDocument();
  });
});
