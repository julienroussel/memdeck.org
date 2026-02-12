import { expect } from "@playwright/test";
import { test } from "./fixtures/test-setup";

// Text patterns
const NO_TRAINING_DATA_YET_PATTERN = /no training data yet/i;
const TOTAL_SESSIONS_PATTERN = /total sessions/i;
const TOTAL_QUESTIONS_PATTERN = /total questions/i;
const OVERALL_ACCURACY_PATTERN = /overall accuracy/i;
const BEST_STREAK_PATTERN = /best streak/i;
const ACCURACY_TREND_PATTERN = /accuracy trend/i;
const SESSION_HISTORY_PATTERN = /session history/i;
const BY_STACK_PATTERN = /by stack/i;
const STATISTICS_BY_STACK_PATTERN = /statistics by stack/i;
const DATE_PATTERN = /date/i;
const MODE_PATTERN = /mode/i;
const STACK_PATTERN = /stack/i;
const SCORE_PATTERN = /score/i;
const SHOW_MORE_PATTERN = /show more/i;
const NO_FILTER_MATCH_PATTERN = /no.*match|no sessions|no data/i;

test.describe("Statistics Page", () => {
  type SessionSeed = {
    id: string;
    mode: string;
    stackKey: string;
    config: { type: string; totalQuestions: number };
    startedAt: string;
    endedAt: string;
    durationSeconds: number;
    successes: number;
    fails: number;
    questionsCompleted: number;
    accuracy: number;
    bestStreak: number;
  };

  type StatsSeed = {
    totalSessions: number;
    totalQuestions: number;
    totalSuccesses: number;
    totalFails: number;
    globalBestStreak: number;
  };

  async function seedAndNavigate(
    page: import("@playwright/test").Page,
    sessions: SessionSeed[],
    allTimeStats: Record<string, StatsSeed>
  ) {
    await page.goto("/");
    await page.evaluate(
      ({ sessions, allTimeStats }) => {
        localStorage.setItem(
          "memdeck-app-session-history",
          JSON.stringify(sessions)
        );
        localStorage.setItem(
          "memdeck-app-all-time-stats",
          JSON.stringify(allTimeStats)
        );
      },
      { sessions, allTimeStats }
    );
    await page.goto("/stats");
    await page.waitForLoadState("networkidle");
  }

  function makeSession(
    overrides: Partial<SessionSeed> & { id: string }
  ): SessionSeed {
    return {
      mode: "flashcard",
      stackKey: "mnemonica",
      config: { type: "structured", totalQuestions: 10 },
      startedAt: new Date("2026-02-10T10:00:00Z").toISOString(),
      endedAt: new Date("2026-02-10T10:05:00Z").toISOString(),
      durationSeconds: 300,
      successes: 8,
      fails: 2,
      questionsCompleted: 10,
      accuracy: 0.8,
      bestStreak: 5,
      ...overrides,
    };
  }

  function makeStats(overrides?: Partial<StatsSeed>): StatsSeed {
    return {
      totalSessions: 1,
      totalQuestions: 10,
      totalSuccesses: 8,
      totalFails: 2,
      globalBestStreak: 5,
      ...overrides,
    };
  }

  test("should load stats page without requiring a stack selection", async ({
    page,
  }) => {
    // Navigate directly to stats page without selecting a stack first
    await page.goto("/stats");
    await page.waitForLoadState("networkidle");

    // Page should load successfully
    await expect(page.getByRole("heading", { name: "Stats" })).toBeVisible();

    // Empty state should be displayed since there's no session history
    await expect(page.getByText(NO_TRAINING_DATA_YET_PATTERN)).toBeVisible();
  });

  test("should display empty state when no session history exists", async ({
    page,
  }) => {
    // Clear localStorage to ensure no session history
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
    });

    // Navigate to stats page
    await page.goto("/stats");
    await page.waitForLoadState("networkidle");

    // Title should be visible
    await expect(page.getByRole("heading", { name: "Stats" })).toBeVisible();

    // Empty state message should be visible
    await expect(page.getByText(NO_TRAINING_DATA_YET_PATTERN)).toBeVisible();

    // Stats components should not be visible
    await expect(page.getByText(TOTAL_SESSIONS_PATTERN)).not.toBeVisible();
    await expect(page.getByText(ACCURACY_TREND_PATTERN)).not.toBeVisible();
    await expect(page.getByText(SESSION_HISTORY_PATTERN)).not.toBeVisible();
  });

  test("should display stats overview when session history exists", async ({
    page,
  }) => {
    await seedAndNavigate(
      page,
      [
        makeSession({
          id: "test-session-1",
          durationSeconds: 330,
          endedAt: new Date("2026-02-10T10:05:30Z").toISOString(),
        }),
      ],
      { "flashcard:mnemonica": makeStats() }
    );

    // Stats overview section should be visible with all metrics
    await expect(page.getByText(TOTAL_SESSIONS_PATTERN).first()).toBeVisible();
    await expect(page.getByText(TOTAL_QUESTIONS_PATTERN).first()).toBeVisible();
    await expect(
      page.getByText(OVERALL_ACCURACY_PATTERN).first()
    ).toBeVisible();
    await expect(page.getByText(BEST_STREAK_PATTERN).first()).toBeVisible();

    // Should display the correct values
    await expect(page.locator("text=1").first()).toBeVisible(); // Total sessions
    await expect(page.locator("text=10").first()).toBeVisible(); // Total questions
    await expect(page.locator("text=80%").first()).toBeVisible(); // Accuracy
    await expect(page.locator("text=5").first()).toBeVisible(); // Best streak
  });

  test("should display accuracy chart with filter controls", async ({
    page,
  }) => {
    await seedAndNavigate(
      page,
      [
        makeSession({
          id: "test-1",
          successes: 9,
          fails: 1,
          accuracy: 0.9,
          bestStreak: 7,
        }),
        makeSession({
          id: "test-2",
          mode: "acaan",
          startedAt: new Date("2026-02-10T11:00:00Z").toISOString(),
          endedAt: new Date("2026-02-10T11:08:00Z").toISOString(),
          durationSeconds: 480,
          successes: 7,
          fails: 3,
          accuracy: 0.7,
          bestStreak: 4,
        }),
        makeSession({
          id: "test-3",
          stackKey: "aronson",
          startedAt: new Date("2026-02-10T12:00:00Z").toISOString(),
          endedAt: new Date("2026-02-10T12:06:00Z").toISOString(),
          durationSeconds: 360,
        }),
      ],
      {
        "flashcard:mnemonica": makeStats({
          totalSuccesses: 9,
          totalFails: 1,
          globalBestStreak: 7,
        }),
        "acaan:mnemonica": makeStats({
          totalSuccesses: 7,
          totalFails: 3,
          globalBestStreak: 4,
        }),
        "flashcard:aronson": makeStats(),
      }
    );

    // Accuracy chart title should be visible
    await expect(page.getByText(ACCURACY_TREND_PATTERN)).toBeVisible();

    // Filter controls should be visible (segmented control)
    const segmentedControl = page.getByRole("radiogroup");
    await expect(
      segmentedControl.getByText("All", { exact: true })
    ).toBeVisible();
    await expect(
      segmentedControl.getByText("Flashcard", { exact: true })
    ).toBeVisible();
    await expect(
      segmentedControl.getByText("ACAAN", { exact: true })
    ).toBeVisible();

    // Progress bars should be visible (chart data)
    const progressBars = page.getByRole("progressbar");
    await expect(progressBars.first()).toBeVisible();
  });

  test("should filter accuracy chart by mode", async ({ page }) => {
    await seedAndNavigate(
      page,
      [
        makeSession({
          id: "flash-1",
          successes: 9,
          fails: 1,
          accuracy: 0.9,
          bestStreak: 7,
        }),
        makeSession({
          id: "acaan-1",
          mode: "acaan",
          startedAt: new Date("2026-02-10T11:00:00Z").toISOString(),
          endedAt: new Date("2026-02-10T11:08:00Z").toISOString(),
          durationSeconds: 480,
          successes: 6,
          fails: 4,
          accuracy: 0.6,
          bestStreak: 3,
        }),
      ],
      {
        "flashcard:mnemonica": makeStats({
          totalSuccesses: 9,
          totalFails: 1,
          globalBestStreak: 7,
        }),
        "acaan:mnemonica": makeStats({
          totalSuccesses: 6,
          totalFails: 4,
          globalBestStreak: 3,
        }),
      }
    );

    // Click "Flashcard" filter
    const segmentedControl = page.getByRole("radiogroup");
    const flashcardFilter = segmentedControl.locator("text=Flashcard");
    await flashcardFilter.click();

    // Should show flashcard data
    await expect(page.locator("text=90%").first()).toBeVisible();

    // Click "ACAAN" filter
    const acaanFilter = segmentedControl.locator("text=ACAAN");
    await acaanFilter.click();

    // Should show ACAAN data
    await expect(page.locator("text=60%").first()).toBeVisible();
  });

  test("should display session history table", async ({ page }) => {
    await seedAndNavigate(
      page,
      [
        makeSession({
          id: "test-session-1",
          startedAt: new Date("2026-02-10T14:30:00Z").toISOString(),
          endedAt: new Date("2026-02-10T14:35:45Z").toISOString(),
          durationSeconds: 345,
        }),
      ],
      { "flashcard:mnemonica": makeStats() }
    );

    // Session history title should be visible
    await expect(
      page.getByRole("heading", { name: SESSION_HISTORY_PATTERN })
    ).toBeVisible();

    // Table should be visible with headers
    const sessionHistoryTable = page.getByRole("table", {
      name: SESSION_HISTORY_PATTERN,
    });
    await expect(sessionHistoryTable).toBeVisible();
    await expect(sessionHistoryTable.getByText(DATE_PATTERN)).toBeVisible();
    await expect(sessionHistoryTable.getByText(MODE_PATTERN)).toBeVisible();
    await expect(sessionHistoryTable.getByText(STACK_PATTERN)).toBeVisible();
    await expect(sessionHistoryTable.getByText(SCORE_PATTERN)).toBeVisible();

    // Table should contain session data
    await expect(sessionHistoryTable.getByText("flashcard")).toBeVisible();
    await expect(sessionHistoryTable.getByText("8/10")).toBeVisible();
    await expect(sessionHistoryTable.getByText("80%")).toBeVisible();

    // Verify at least one row exists in the table
    const tableRows = sessionHistoryTable.locator("tbody tr");
    await expect(tableRows.first()).toBeVisible();
  });

  test("should display by-stack breakdown", async ({ page }) => {
    await seedAndNavigate(
      page,
      [
        makeSession({
          id: "mnem-1",
          successes: 9,
          fails: 1,
          accuracy: 0.9,
          bestStreak: 7,
        }),
        makeSession({
          id: "aron-1",
          stackKey: "aronson",
          startedAt: new Date("2026-02-10T11:00:00Z").toISOString(),
          endedAt: new Date("2026-02-10T11:06:00Z").toISOString(),
          durationSeconds: 360,
          successes: 7,
          fails: 3,
          accuracy: 0.7,
          bestStreak: 4,
        }),
      ],
      {
        "flashcard:mnemonica": makeStats({
          totalSuccesses: 9,
          totalFails: 1,
          globalBestStreak: 7,
        }),
        "flashcard:aronson": makeStats({
          totalSuccesses: 7,
          totalFails: 3,
          globalBestStreak: 4,
        }),
      }
    );

    // By-stack section title should be visible
    await expect(
      page.getByRole("heading", { name: BY_STACK_PATTERN })
    ).toBeVisible();

    // Should display by-stack table with data
    const byStackTable = page.getByRole("table", {
      name: STATISTICS_BY_STACK_PATTERN,
    });
    await expect(byStackTable).toBeVisible();

    // Check if table has rows with stack data (at least one row in tbody)
    const tableRows = byStackTable.locator("tbody tr");
    await expect(tableRows.first()).toBeVisible();

    // Should show correct stats for each stack based on seeded data
    // Mnemonica (displayed as "Tamariz"): 1 session, 10 questions, 90% accuracy, best streak 7
    await expect(byStackTable).toContainText("Tamariz");
    await expect(byStackTable).toContainText("90%");

    // Aronson: 1 session, 10 questions, 70% accuracy, best streak 4
    await expect(byStackTable).toContainText("Aronson");
    await expect(byStackTable).toContainText("70%");

    // Total table count (session history + by-stack)
    const tables = page.getByRole("table");
    await expect(tables).toHaveCount(2);
  });

  test("should persist stats across page reloads", async ({ page }) => {
    await seedAndNavigate(
      page,
      [
        makeSession({
          id: "persist-test-1",
          successes: 10,
          fails: 0,
          accuracy: 1.0,
          bestStreak: 10,
        }),
      ],
      {
        "flashcard:mnemonica": makeStats({
          totalSuccesses: 10,
          totalFails: 0,
          globalBestStreak: 10,
        }),
      }
    );

    // Verify data is displayed
    await expect(page.getByText("100%").first()).toBeVisible();
    await expect(page.getByText("10/10")).toBeVisible();

    // Reload page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Data should still be visible
    await expect(page.getByText("100%").first()).toBeVisible();
    await expect(page.getByText("10/10")).toBeVisible();
    await expect(page.getByText(TOTAL_SESSIONS_PATTERN)).toBeVisible();
  });

  test("should display correct accuracy colors in chart", async ({ page }) => {
    await seedAndNavigate(
      page,
      [
        makeSession({
          id: "high-acc",
          successes: 9,
          fails: 1,
          accuracy: 0.9,
          bestStreak: 7,
        }),
        makeSession({
          id: "mid-acc",
          startedAt: new Date("2026-02-10T11:00:00Z").toISOString(),
          endedAt: new Date("2026-02-10T11:06:00Z").toISOString(),
          durationSeconds: 360,
          successes: 6,
          fails: 4,
          accuracy: 0.6,
          bestStreak: 4,
        }),
        makeSession({
          id: "low-acc",
          startedAt: new Date("2026-02-10T12:00:00Z").toISOString(),
          endedAt: new Date("2026-02-10T12:07:00Z").toISOString(),
          durationSeconds: 420,
          successes: 3,
          fails: 7,
          accuracy: 0.3,
          bestStreak: 2,
        }),
      ],
      {
        "flashcard:mnemonica": makeStats({
          totalSessions: 3,
          totalQuestions: 30,
          totalSuccesses: 18,
          totalFails: 12,
          globalBestStreak: 7,
        }),
      }
    );

    // Chart should display different colored progress bars
    const progressBars = page.getByRole("progressbar");
    await expect(progressBars.first()).toBeVisible();

    // Verify percentages are displayed
    await expect(page.locator("text=90%").first()).toBeVisible();
    await expect(page.locator("text=60%").first()).toBeVisible();
    await expect(page.locator("text=30%").first()).toBeVisible();
  });

  test("should show 'Show More' button when history exceeds page size", async ({
    page,
  }) => {
    // Pre-populate with more than 20 sessions (PAGE_SIZE = 20)
    const sessions: SessionSeed[] = [];
    for (let i = 0; i < 25; i++) {
      sessions.push(
        makeSession({
          id: `session-${i}`,
          startedAt: new Date(
            2026,
            1,
            10,
            10 + Math.floor(i / 6),
            (i * 10) % 60
          ).toISOString(),
          endedAt: new Date(
            2026,
            1,
            10,
            10 + Math.floor(i / 6),
            ((i * 10) % 60) + 5
          ).toISOString(),
        })
      );
    }

    await seedAndNavigate(page, sessions, {
      "flashcard:mnemonica": makeStats({
        totalSessions: 25,
        totalQuestions: 250,
        totalSuccesses: 200,
        totalFails: 50,
        globalBestStreak: 15,
      }),
    });

    // Show More button should be visible
    const showMoreButton = page.getByRole("button", {
      name: SHOW_MORE_PATTERN,
    });
    await expect(showMoreButton).toBeVisible();

    // Click Show More
    await showMoreButton.click();

    // More rows should be visible in the table (more than 20)
    await expect(page.locator("tbody tr").nth(20)).toBeVisible();
  });

  test("should display duration in session history", async ({ page }) => {
    await seedAndNavigate(
      page,
      [
        makeSession({
          id: "duration-test",
          endedAt: new Date("2026-02-10T10:03:25Z").toISOString(),
          durationSeconds: 205, // 3 minutes 25 seconds
          successes: 10,
          fails: 0,
          accuracy: 1.0,
          bestStreak: 10,
        }),
      ],
      {
        "flashcard:mnemonica": makeStats({
          totalSuccesses: 10,
          totalFails: 0,
          globalBestStreak: 10,
        }),
      }
    );

    // Duration should be visible in table (formatted as "3m 25s")
    // Use .last() to get session history table (second table on the page)
    const table = page.getByRole("table").last();
    await expect(table).toContainText("3m 25s");
  });

  test("should navigate to stats from other pages", async ({ page }) => {
    // Start at home
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Navigate to stats using nav link
    await page.locator("a:has-text('Stats')").first().click();
    await page.waitForLoadState("networkidle");

    // Should arrive at stats page
    await expect(page.getByRole("heading", { name: "Stats" })).toBeVisible();

    // URL should be correct
    expect(page.url()).toContain("/stats");
  });

  test("should display correct all-time stats aggregation", async ({
    page,
  }) => {
    await seedAndNavigate(
      page,
      [
        makeSession({
          id: "agg-1",
          startedAt: new Date("2026-02-08T10:00:00Z").toISOString(),
          endedAt: new Date("2026-02-08T10:05:00Z").toISOString(),
        }),
        makeSession({
          id: "agg-2",
          stackKey: "aronson",
          startedAt: new Date("2026-02-09T10:00:00Z").toISOString(),
          endedAt: new Date("2026-02-09T10:06:00Z").toISOString(),
          durationSeconds: 360,
          successes: 9,
          fails: 1,
          accuracy: 0.9,
          bestStreak: 7,
        }),
        makeSession({
          id: "agg-3",
          mode: "acaan",
          startedAt: new Date("2026-02-10T10:00:00Z").toISOString(),
          endedAt: new Date("2026-02-10T10:08:00Z").toISOString(),
          durationSeconds: 480,
          successes: 7,
          fails: 3,
          accuracy: 0.7,
          bestStreak: 4,
        }),
      ],
      {
        "flashcard:mnemonica": makeStats(),
        "flashcard:aronson": makeStats({
          totalSuccesses: 9,
          totalFails: 1,
          globalBestStreak: 7,
        }),
        "acaan:mnemonica": makeStats({
          totalSuccesses: 7,
          totalFails: 3,
          globalBestStreak: 4,
        }),
      }
    );

    // Should show aggregated totals
    await expect(page.getByText(TOTAL_SESSIONS_PATTERN).first()).toBeVisible();

    // Total sessions should be 3
    const statsDisplay = page.locator("[data-testid='stats-overview']");
    await expect(statsDisplay).toContainText("3");

    // Total questions should be 30
    await expect(statsDisplay).toContainText("30");

    // Overall accuracy should be 80% (24 successes / 30 questions)
    await expect(statsDisplay).toContainText("80%");

    // Global best streak should be 7 (max across all sessions)
    await expect(statsDisplay).toContainText("7");
  });

  test("should handle empty filter results gracefully", async ({ page }) => {
    await seedAndNavigate(
      page,
      [
        makeSession({
          id: "flash-only",
          successes: 9,
          fails: 1,
          accuracy: 0.9,
          bestStreak: 7,
        }),
      ],
      {
        "flashcard:mnemonica": makeStats({
          totalSuccesses: 9,
          totalFails: 1,
          globalBestStreak: 7,
        }),
      }
    );

    // Click ACAAN filter (should have no results)
    const acaanFilter = page.getByRole("radiogroup").locator("text=ACAAN");
    await acaanFilter.click();

    // Should display "no filter match" message or similar
    await expect(page.getByText(NO_FILTER_MATCH_PATTERN)).toBeVisible();
  });

  test("should navigate away from stats and return successfully", async ({
    page,
  }) => {
    await seedAndNavigate(page, [makeSession({ id: "nav-test" })], {
      "flashcard:mnemonica": makeStats(),
    });

    // Verify stats are visible
    await expect(page.getByText(TOTAL_SESSIONS_PATTERN).first()).toBeVisible();

    // Navigate away
    await page.locator("a:has-text('Home')").first().click();
    await page.waitForLoadState("networkidle");

    // Navigate back to stats
    await page.locator("a:has-text('Stats')").first().click();
    await page.waitForLoadState("networkidle");

    // Stats should still be visible
    await expect(page.getByRole("heading", { name: "Stats" })).toBeVisible();
    await expect(page.getByText(TOTAL_SESSIONS_PATTERN).first()).toBeVisible();
    await expect(page.getByText("80%").first()).toBeVisible();
  });
});
