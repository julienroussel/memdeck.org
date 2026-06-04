import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { test } from "./fixtures/test-setup";

const NEW_CHALLENGE_PATTERN = /new challenge/i;
const NUMBERONLY_DEEP_LINK = /\/flashcard\/\?try=numberonly$/;
const NEIGHBOR_DEEP_LINK = /\/flashcard\/\?try=neighbor$/;
// The page strips the deep-link param on mount, so the landed URL is bare.
const STRIPPED_FLASHCARD_URL = /\/flashcard\/$/;
const STRIPPED_ACAAN_URL = /\/acaan\/$/;

type Seed = {
  sessions: Record<string, unknown>[];
  totalSessions: number;
};

function session(
  id: string,
  extra: Record<string, unknown>
): Record<string, unknown> {
  return {
    id,
    stackKey: "mnemonica",
    config: { type: "structured", totalQuestions: 10 },
    startedAt: "2026-02-10T10:00:00.000Z",
    endedAt: "2026-02-10T10:05:00.000Z",
    durationSeconds: 300,
    successes: 8,
    fails: 2,
    questionsCompleted: 10,
    accuracy: 0.8,
    bestStreak: 5,
    ...extra,
  };
}

// One session of every whole mode (4 total): ≥ DISCOVERY_MIN_SESSIONS (3) but
// < SHARE_NUDGE_MIN_SESSIONS (5). All whole modes are tried, so a sub-variant
// surfaces; the 1-each tie resolves most-used to flashcard (first in
// TRAINING_MODES), making flashcard-numberonly the top suggestion and
// flashcard-neighbor the next one.
const ALL_WHOLE_MODES_SEED: Seed = {
  sessions: [
    session("s0", { mode: "flashcard", flashcardMode: "cardonly" }),
    session("s1", { mode: "spotcheck", spotCheckMode: "missing" }),
    session("s2", { mode: "distance" }),
    session("s3", { mode: "acaan" }),
  ],
  totalSessions: 4,
};

// Seed a selected stack + session history + an all-time-stats total before the
// app mounts, then open home. The app reads these via useSyncExternalStore on
// mount, so the seeded stack flips home to the with-stack view. The init script
// re-runs on every full navigation/reload but leaves the discovery state
// (FEATURE_DISCOVERY_LSK) untouched, so accept/dismiss writes survive a reload.
async function seedAndOpenHome(page: Page, seed: Seed) {
  await page.addInitScript((data: Seed) => {
    localStorage.setItem("memdeck-app-stack", JSON.stringify("mnemonica"));
    localStorage.setItem(
      "memdeck-app-session-history",
      JSON.stringify(data.sessions)
    );
    localStorage.setItem(
      "memdeck-app-all-time-stats",
      JSON.stringify({
        "flashcard:mnemonica": {
          totalSessions: data.totalSessions,
          totalQuestions: data.totalSessions * 10,
          totalSuccesses: data.totalSessions * 8,
          totalFails: data.totalSessions * 2,
          globalBestStreak: 5,
        },
      })
    );
  }, seed);
  await page.goto("/");
}

test.describe("Feature Discovery — Next Challenge card", () => {
  test("shows a suggestion after enough sessions and hides it on dismiss", async ({
    page,
  }) => {
    // 4 flashcard (card-only) sessions: ≥ DISCOVERY_MIN_SESSIONS (3) but <
    // SHARE_NUDGE_MIN_SESSIONS (5), so the discovery card shows and the share
    // nudge stays dormant.
    await seedAndOpenHome(page, {
      sessions: [0, 1, 2, 3].map((index) =>
        session(`seed-${index}`, {
          mode: "flashcard",
          flashcardMode: "cardonly",
        })
      ),
      totalSessions: 4,
    });

    const eyebrow = page.getByText(NEW_CHALLENGE_PATTERN);
    await expect(eyebrow).toBeVisible();
    await expect(page.getByRole("link", { name: "Try it" })).toBeVisible();

    await page.getByRole("button", { name: "Dismiss" }).click();

    // Dismiss retires the suggestion and snoozes the surface — the card is gone.
    await expect(eyebrow).toHaveCount(0);

    // The dismissal must survive a reload: this asserts the write to
    // FEATURE_DISCOVERY_LSK actually landed, not just the in-memory store update
    // (a silently-failed localStorage write would resurface the card here).
    await page.reload();
    await expect(eyebrow).toHaveCount(0);
  });

  test("Try it lands in the suggested variant and strips the deep-link param", async ({
    page,
  }) => {
    await seedAndOpenHome(page, ALL_WHOLE_MODES_SEED);

    await expect(page.getByText(NEW_CHALLENGE_PATTERN)).toBeVisible();
    // The card's link carries the deep-link param...
    const tryLink = page.getByRole("link", { name: "Try it" });
    await expect(tryLink).toHaveAttribute("href", NUMBERONLY_DEEP_LINK);
    await tryLink.click();

    // ...but the flashcard page consumes `?try=numberonly` on mount: it applies
    // the mode through the canonical setter (persisting it) and strips the param.
    await expect(page).toHaveURL(STRIPPED_FLASHCARD_URL);
    const persistedMode = await page.evaluate(() =>
      localStorage.getItem("memdeck-app-flashcard-option")
    );
    expect(persistedMode).toBe(JSON.stringify("numberonly"));
  });

  test("accepting a suggestion retires it across a reload", async ({
    page,
  }) => {
    await seedAndOpenHome(page, ALL_WHOLE_MODES_SEED);

    // Top suggestion is flashcard-numberonly; accept it via the CTA.
    const tryLink = page.getByRole("link", { name: "Try it" });
    await expect(tryLink).toHaveAttribute("href", NUMBERONLY_DEEP_LINK);
    await tryLink.click();
    await expect(page).toHaveURL(STRIPPED_FLASHCARD_URL);

    // Return home with a full navigation — page.goto reloads the document and
    // re-hydrates from localStorage. If the accept write to
    // FEATURE_DISCOVERY_LSK landed, flashcard-numberonly is retired and the
    // next suggestion (flashcard-neighbor) takes its place — proving retirement
    // persisted, not just an in-memory store update.
    await page.goto("/");

    await expect(page.getByText(NEW_CHALLENGE_PATTERN)).toBeVisible();
    await expect(page.getByRole("link", { name: "Try it" })).toHaveAttribute(
      "href",
      NEIGHBOR_DEEP_LINK
    );
  });

  test("a ?timed=1 deep link enables the timer and strips the param", async ({
    page,
  }) => {
    // No suggestion emits `?timed=` until #697, but the mode pages consume it
    // now (ACAAN honors only `timed`). Hit the deep link directly to prove the
    // wiring: the page enables its timer via the canonical setter (persisting
    // it) and strips the param.
    await page.addInitScript(() => {
      localStorage.setItem("memdeck-app-stack", JSON.stringify("mnemonica"));
    });
    await page.goto("/acaan/?timed=1");

    await expect(page).toHaveURL(STRIPPED_ACAAN_URL);
    const persistedTimer = await page.evaluate(() =>
      localStorage.getItem("memdeck-app-acaan-trainer-timer")
    );
    expect(persistedTimer).toContain('"enabled":true');
  });
});
