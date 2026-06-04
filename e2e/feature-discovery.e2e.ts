import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { test } from "./fixtures/test-setup";

const NEW_CHALLENGE_PATTERN = /new challenge/i;
const NUMBERONLY_DEEP_LINK = /\/flashcard\/\?try=numberonly$/;
const NEIGHBOR_DEEP_LINK = /\/flashcard\/\?try=neighbor$/;

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

  test("Try it navigates to the deep-linked route", async ({ page }) => {
    await seedAndOpenHome(page, ALL_WHOLE_MODES_SEED);

    await expect(page.getByText(NEW_CHALLENGE_PATTERN)).toBeVisible();
    await page.getByRole("link", { name: "Try it" }).click();

    // The flashcard page does not consume `?try=` yet — accepting lands in the
    // default mode. #696 will honor the param; this assertion should then also
    // verify the suggested variant is preselected.
    await expect(page).toHaveURL(NUMBERONLY_DEEP_LINK);
  });

  test("accepting a suggestion retires it across a reload", async ({
    page,
  }) => {
    await seedAndOpenHome(page, ALL_WHOLE_MODES_SEED);

    // Top suggestion is flashcard-numberonly; accept it via the CTA.
    const tryLink = page.getByRole("link", { name: "Try it" });
    await expect(tryLink).toHaveAttribute("href", NUMBERONLY_DEEP_LINK);
    await tryLink.click();
    await expect(page).toHaveURL(NUMBERONLY_DEEP_LINK);

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
});
