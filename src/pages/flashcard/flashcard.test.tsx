import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "../../test-utils";
import type { FlashcardMode, NeighborDirection } from "../../types/flashcard";
import {
  createDeckPosition,
  type PlayingCardPosition,
  stacks,
} from "../../types/stacks";
import type { ResolvedDirection } from "../../utils/neighbor";

// Mock the timer hook so useFlashcardGame mounts without a real interval.
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
  useGameTimer: vi.fn(),
}));

vi.mock("@mantine/notifications", () => ({
  notifications: { show: vi.fn() },
}));

vi.mock("../../services/event-bus", () => ({
  eventBus: {
    emit: {
      FLASHCARD_ANSWER: vi.fn(),
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

const fullLimits = {
  end: createDeckPosition(52),
  start: createDeckPosition(1),
};

type StackLimitsResult = {
  limits: typeof fullLimits;
  setLimits: ReturnType<typeof vi.fn>;
  rangeSize: number;
  isFullDeck: boolean;
};

const limitsResult = (start: number, end: number): StackLimitsResult => ({
  isFullDeck: start === 1 && end === 52,
  limits: { end: createDeckPosition(end), start: createDeckPosition(start) },
  rangeSize: end - start + 1,
  setLimits: vi.fn(),
});

const mockUseStackLimits = vi.fn<() => StackLimitsResult>();

vi.mock("../../hooks/use-stack-limits", () => ({
  useStackLimits: () => mockUseStackLimits(),
}));

type FlashcardSettingsResult = {
  mode: FlashcardMode;
  neighborDirection: NeighborDirection;
  timerSettings: { enabled: boolean; duration: number };
  setTimerDuration: ReturnType<typeof vi.fn>;
  handleModeChange: ReturnType<typeof vi.fn>;
  handleDirectionChange: ReturnType<typeof vi.fn>;
  handleTimerEnabledChange: ReturnType<typeof vi.fn>;
};

const settingsResult = (
  mode: FlashcardMode,
  neighborDirection: NeighborDirection
): FlashcardSettingsResult => ({
  handleDirectionChange: vi.fn(),
  handleModeChange: vi.fn(),
  handleTimerEnabledChange: vi.fn(),
  mode,
  neighborDirection,
  setTimerDuration: vi.fn(),
  timerSettings: { duration: 15, enabled: false },
});

const mockUseFlashcardSettings = vi.fn<() => FlashcardSettingsResult>();

vi.mock("./use-flashcard-settings", () => ({
  useFlashcardSettings: () => mockUseFlashcardSettings(),
}));

// Controls whether the page believes a ?try= deep link is pending.
let mockDeepLinkPending = false;

vi.mock("../../hooks/use-suggestion-deep-link", () => ({
  tryHandler: () => () => false,
  useSuggestionDeepLink: () => mockDeepLinkPending,
}));

type CapturedSessionOpts = { autoStart: boolean };
let capturedSessionOpts: CapturedSessionOpts[] = [];

vi.mock("../../hooks/use-session", () => ({
  useSession: (opts: CapturedSessionOpts) => {
    capturedSessionOpts.push(opts);
    return {
      activeSession: null,
      dismissSummary: vi.fn(),
      handleAnswer: vi.fn(),
      isStructuredSession: false,
      startNewSession: vi.fn(),
      startSession: vi.fn(),
      status: { phase: "idle" },
      stopSession: vi.fn(),
    };
  },
}));

// Capture the props the page wires into the active round so we can assert
// the answer card it surfaces, without rendering the heavy card spread.
type CapturedRoundProps = {
  card: PlayingCardPosition;
  answerCard: PlayingCardPosition;
  resolvedDirection: ResolvedDirection | null;
};
let capturedRoundProps: CapturedRoundProps[] = [];

vi.mock("./flashcard-active-round", () => ({
  FlashcardActiveRound: (props: CapturedRoundProps) => {
    capturedRoundProps.push(props);
    return null;
  },
}));

// Stub the heavy children so the test only exercises the Flashcard page logic.
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

const lastRoundProps = (): CapturedRoundProps => {
  const props = capturedRoundProps.at(-1);
  if (!props) {
    throw new Error("FlashcardActiveRound was not rendered");
  }
  return props;
};

beforeEach(() => {
  capturedRoundProps = [];
  capturedSessionOpts = [];
  mockDeepLinkPending = false;
  mockUseFlashcardSettings.mockReturnValue(settingsResult("neighbor", "after"));
  mockUseStackLimits.mockReturnValue(limitsResult(1, 52));
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("Flashcard — neighbor mode answer card", () => {
  it("passes the neighbor (not the prompt card) as the answer card", async () => {
    const { Flashcard } = await import("./flashcard");
    render(<Flashcard />);

    const { card, answerCard, resolvedDirection } = lastRoundProps();
    expect(resolvedDirection).toBe("after");
    // Direction "after" with full limits: position + 1, wrapping 52 → 1.
    const expectedIndex = card.index === 52 ? 1 : card.index + 1;
    expect(answerCard.index).toBe(expectedIndex);
    expect(answerCard.index).not.toBe(card.index);
    expect(stacks.mnemonica.order[answerCard.index - 1]).toBe(answerCard.card);
  });

  it("does not crash when limits narrow past the on-screen card (F5 regression)", async () => {
    // Start with a range high in the deck so the drawn card is guaranteed
    // to fall outside the narrowed range below.
    mockUseStackLimits.mockReturnValue(limitsResult(40, 52));
    const { Flashcard } = await import("./flashcard");
    const { rerender } = render(<Flashcard />);

    const before = lastRoundProps();
    expect(before.card.index).toBeGreaterThanOrEqual(40);

    mockUseStackLimits.mockReturnValue(limitsResult(1, 10));
    expect(() => rerender(<Flashcard />)).not.toThrow();

    // The committed round is drawn entirely from the new range.
    const after = lastRoundProps();
    expect(after.card.index).toBeGreaterThanOrEqual(1);
    expect(after.card.index).toBeLessThanOrEqual(10);
    expect(after.answerCard.index).toBeGreaterThanOrEqual(1);
    expect(after.answerCard.index).toBeLessThanOrEqual(10);
  });
});

describe("Flashcard — session auto-start vs deep link", () => {
  it("passes autoStart=false to useSession while a ?try= deep link is pending", async () => {
    mockDeepLinkPending = true;
    const { Flashcard } = await import("./flashcard");
    render(<Flashcard />);

    expect(capturedSessionOpts.length).toBeGreaterThan(0);
    for (const opts of capturedSessionOpts) {
      expect(opts.autoStart).toBe(false);
    }
  });

  it("passes autoStart=true to useSession when no deep link is pending", async () => {
    const { Flashcard } = await import("./flashcard");
    render(<Flashcard />);

    expect(capturedSessionOpts.length).toBeGreaterThan(0);
    for (const opts of capturedSessionOpts) {
      expect(opts.autoStart).toBe(true);
    }
  });
});
