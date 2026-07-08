import { MantineProvider } from "@mantine/core";
import { render, waitFor } from "@testing-library/react";
import { type ReactNode, useEffect, useState } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ROUTES } from "../../constants";
import { stacks } from "../../types/stacks";

// Capture every useSession invocation so tests can assert how the page gates
// autoStart while a deep-link param is pending.
type CapturedSessionOpts = { autoStart: boolean };
let capturedSessionCalls: CapturedSessionOpts[] = [];

vi.mock("../../hooks/use-session", () => ({
  useSession: (options: CapturedSessionOpts) => {
    capturedSessionCalls.push(options);
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

// Captured settings setter — ACAAN has no ?try variants, so ?timed=1 applying
// through this existing setter is the page's whole deep-link surface.
const handleTimerEnabledChange = vi.fn();

vi.mock("./use-acaan-settings", () => ({
  useAcaanSettings: () => ({
    handleTimerEnabledChange,
    setTimerDuration: vi.fn(),
    timerSettings: { duration: 15, enabled: false },
  }),
}));

vi.mock("./use-acaan-game", () => ({
  useAcaanGame: () => ({
    revealAnswer: vi.fn(),
    scenario: {
      card: stacks.mnemonica.order[0],
      cutDepth: 6,
      targetPosition: 10,
    },
    score: { fails: 0, successes: 0 },
    submitAnswer: vi.fn(),
    timeRemaining: 15,
    timerDuration: 15,
  }),
}));

vi.mock("./use-cut-depth-input", () => ({
  useCutDepthInput: () => ({
    cutDepth: "",
    handleCheckAnswer: vi.fn(),
    handleCutDepthChange: vi.fn(),
    handleKeyDown: vi.fn(),
    maxCutDepth: 51,
  }),
}));

vi.mock("@mantine/notifications", () => ({
  notifications: { show: vi.fn() },
}));

vi.mock("../../services/event-bus", () => ({
  eventBus: {
    emit: {
      ACAAN_ANSWER: vi.fn(),
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

vi.mock("../../hooks/use-card-image-preload", () => ({
  useCardImagePreload: vi.fn(),
}));

vi.mock("../../hooks/use-selected-stack", () => ({
  useRequiredStack: () => ({
    stack: stacks.mnemonica,
    stackKey: "mnemonica",
    stackName: stacks.mnemonica.name,
    stackOrder: stacks.mnemonica.order,
  }),
}));

// Stub the heavy children so the tests only exercise the page's deep-link
// wiring.
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

// Mount the page one commit AFTER the Router so the Router's history listener
// is attached before useSuggestionDeepLink's layout-effect navigate() fires —
// same rationale as DeferredMount in use-suggestion-deep-link.test.tsx.
function DeferredMount({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted ? children : null;
}

const renderPage = async (initialEntry: string) => {
  // Lazy import after mocks are set up.
  const { Acaan } = await import("./acaan");
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <MantineProvider>
        <DeferredMount>
          <Acaan />
        </DeferredMount>
      </MantineProvider>
    </MemoryRouter>
  );
};

beforeEach(() => {
  capturedSessionCalls = [];
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("Acaan — deep-link preselect", () => {
  it("applies ?timed=1 through the timer setter and gates autoStart until the param is consumed", async () => {
    await renderPage(`${ROUTES.acaan}?timed=1`);

    await waitFor(() => {
      expect(handleTimerEnabledChange).toHaveBeenCalledWith(true);
    });
    // While the param was pending, the session must not auto-start.
    expect(capturedSessionCalls[0]?.autoStart).toBe(false);
    // Once the layout effect strips the param, auto-start is released.
    await waitFor(() => {
      expect(capturedSessionCalls.at(-1)?.autoStart).toBe(true);
    });
  });

  it("ignores a ?try value (ACAAN has no try handlers) but still strips it and releases autoStart", async () => {
    await renderPage(`${ROUTES.acaan}?try=anything`);

    await waitFor(() => {
      expect(capturedSessionCalls.at(-1)?.autoStart).toBe(true);
    });
    expect(handleTimerEnabledChange).not.toHaveBeenCalled();
    // The pending param still gated the initial auto-start.
    expect(capturedSessionCalls[0]?.autoStart).toBe(false);
  });

  it("auto-starts immediately when no deep-link params are present", async () => {
    await renderPage(ROUTES.acaan);

    await waitFor(() => {
      expect(capturedSessionCalls.length).toBeGreaterThan(0);
    });
    expect(capturedSessionCalls[0]?.autoStart).toBe(true);
    expect(handleTimerEnabledChange).not.toHaveBeenCalled();
  });
});
