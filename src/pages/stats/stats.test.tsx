import { screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "../../test-utils";
import type { LocalDbStatus } from "../../utils/localstorage";

const CORRUPTION_ALERT_TITLE = /training history couldn't be loaded/i;
const CORRUPTION_ALERT_BODY = /sessions are preserved/i;
const EMPTY_STATE_COPY = /no training data yet/i;

const mockUseSessionHistory = vi.fn();
const mockUseAllTimeStats = vi.fn();

vi.mock("../../hooks/use-session-history", () => ({
  useSessionHistory: () => mockUseSessionHistory(),
}));

vi.mock("../../hooks/use-all-time-stats", () => ({
  useAllTimeStats: () => mockUseAllTimeStats(),
}));

vi.mock("../../hooks/use-document-meta", () => ({
  useDocumentMeta: () => undefined,
}));

const { Stats } = await import("./stats");

const emptyStatsEntry = () => ({
  globalBestStreak: 0,
  totalFails: 0,
  totalQuestions: 0,
  totalSessions: 0,
  totalSuccesses: 0,
});

const sessionHistoryDefaults = {
  history: [],
  historyStatus: "ready" as LocalDbStatus,
  sessionsByMode: () => [],
  sessionsByModeAndStack: () => [],
  sessionsByStack: () => [],
};

const allTimeStatsDefaults = {
  getGlobalStats: emptyStatsEntry,
  getStats: emptyStatsEntry,
  getStatsByMode: emptyStatsEntry,
  getStatsByStack: emptyStatsEntry,
  stats: {},
  statsStatus: "ready" as LocalDbStatus,
};

const setHooks = ({
  historyStatus,
  statsStatus,
}: {
  historyStatus: LocalDbStatus;
  statsStatus: LocalDbStatus;
}) => {
  mockUseSessionHistory.mockReturnValue({
    ...sessionHistoryDefaults,
    historyStatus,
  });
  mockUseAllTimeStats.mockReturnValue({
    ...allTimeStatsDefaults,
    statsStatus,
  });
};

describe("Stats corruption banner", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders the corruption alert when session history is corrupt", () => {
    setHooks({ historyStatus: "corrupt", statsStatus: "ready" });

    render(<Stats />);

    const alert = screen.getByRole("alert", { name: CORRUPTION_ALERT_TITLE });
    expect(alert).toBeInTheDocument();
    expect(within(alert).getByText(CORRUPTION_ALERT_BODY)).toBeInTheDocument();
  });

  it("renders the corruption alert when all-time stats is corrupt", () => {
    // The user-visible silent failure described in #626 also fires when only
    // all-time-stats is corrupt: globalStats.totalSessions defaults to 0,
    // hasData is false, and the empty-state would otherwise show with no
    // signal that the data is preserved-but-unreadable.
    setHooks({ historyStatus: "ready", statsStatus: "corrupt" });

    render(<Stats />);

    const alert = screen.getByRole("alert", { name: CORRUPTION_ALERT_TITLE });
    expect(alert).toBeInTheDocument();
    expect(within(alert).getByText(CORRUPTION_ALERT_BODY)).toBeInTheDocument();
  });

  it("renders exactly one corruption alert when both blobs are corrupt", () => {
    setHooks({ historyStatus: "corrupt", statsStatus: "corrupt" });

    render(<Stats />);

    expect(
      screen.getAllByRole("alert", { name: CORRUPTION_ALERT_TITLE })
    ).toHaveLength(1);
  });

  it("does not render the corruption alert when both blobs are ready", () => {
    setHooks({ historyStatus: "ready", statsStatus: "ready" });

    render(<Stats />);

    expect(
      screen.queryByRole("alert", { name: CORRUPTION_ALERT_TITLE })
    ).not.toBeInTheDocument();
  });

  it("suppresses the empty-state copy when corruption is present", () => {
    setHooks({ historyStatus: "corrupt", statsStatus: "ready" });

    render(<Stats />);

    expect(screen.queryByText(EMPTY_STATE_COPY)).not.toBeInTheDocument();
  });
});
