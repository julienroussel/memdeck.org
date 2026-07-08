import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { test } from "./fixtures/test-setup";

const NEW_CHALLENGE_PATTERN = /new challenge/i;
// Structured-session controls (the only UI path to the summary modal).
const START_A_SESSION_PATTERN = /start a session/i;
const START_PRESET_PATTERN = /start \d+ question session/i;
const PROGRESS_ZERO_PATTERN = /progress: 0\/\d+/i;
const PROGRESS_ONE_PATTERN = /progress: 1\/\d+/i;
const NUMBERONLY_DEEP_LINK = /\/flashcard\/\?try=numberonly$/;
const NEIGHBOR_DEEP_LINK = /\/flashcard\/\?try=neighbor$/;
// The page strips the deep-link param on mount, so the landed URL is bare.
const STRIPPED_FLASHCARD_URL = /\/flashcard\/$/;
const STRIPPED_ACAAN_URL = /\/acaan\/$/;
const STRIPPED_DISTANCE_URL = /\/distance\/$/;
const SESSION_HISTORY_KEY = "memdeck-app-session-history";

type Seed = {
  sessions: Record<string, unknown>[];
  totalSessions: number;
};

function session(
  id: string,
  extra: Record<string, unknown>
): Record<string, unknown> {
  return {
    accuracy: 0.8,
    bestStreak: 5,
    config: { totalQuestions: 10, type: "structured" },
    durationSeconds: 300,
    endedAt: "2026-02-10T10:05:00.000Z",
    fails: 2,
    id,
    questionsCompleted: 10,
    stackKey: "mnemonica",
    startedAt: "2026-02-10T10:00:00.000Z",
    successes: 8,
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
    session("s0", { flashcardMode: "cardonly", mode: "flashcard" }),
    session("s1", { mode: "spotcheck", spotCheckMode: "missing" }),
    session("s2", { mode: "distance" }),
    session("s3", { mode: "acaan" }),
  ],
  totalSessions: 4,
};

// Seed a selected stack + session history + an all-time-stats total before the
// app mounts. The app reads these via useSyncExternalStore on mount, so the
// seeded stack flips pages to the with-stack view. The init script re-runs on
// every full navigation/reload but leaves the discovery state
// (FEATURE_DISCOVERY_LSK) untouched, so accept/dismiss writes survive a reload.
async function seedDiscoveryState(page: Page, seed: Seed) {
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
          globalBestStreak: 5,
          totalFails: data.totalSessions * 2,
          totalQuestions: data.totalSessions * 10,
          totalSessions: data.totalSessions,
          totalSuccesses: data.totalSessions * 8,
        },
      })
    );
  }, seed);
}

// Seed discovery state, then open the Next Challenge (home) surface.
async function seedAndOpenHome(page: Page, seed: Seed) {
  await seedDiscoveryState(page, seed);
  await page.goto("/");
}

// Complete `count` questions on a trainer page (flashcard, distance, …), then
// navigate away so the auto-started open session is finalized into history.
// `headingName` is the page's h1 ("Flashcard", "Distance") — asserting it is
// gone confirms the page unmounted (and thus the save fired).
//
// We use the Reveal button, not a card choice: only a CORRECT choice advances
// the question (use-{flashcard,distance}-game.ts — a wrong answer keeps the same
// question with questionAdvanced:false), whereas Reveal always advances
// (questionAdvanced:true), which is what increments questionsCompleted. The
// open session persists only past the >=3-question threshold, so callers
// complete at least 3 — in practice 4, one over the threshold, to absorb the
// brief window after mount before autoStart's passive effect fires, where an
// early Reveal click advances the game without being session-recorded. Gating
// each click on the (page-agnostic) Reveal button's visibility confirms a round
// is interactive before we advance it.
//
// An open session has no Stop button (that's structured-only,
// training-header.tsx); it finalizes on unmount via useSessionAutoSave's
// cleanup. We leave via the header brand link (a react-router Link, always
// visible) to unmount the page and trigger the synchronous save.
async function completeQuestionsThenLeave(
  page: Page,
  count: number,
  headingName: string
) {
  const reveal = page.getByRole("button", { name: "Reveal answer" });
  for (let i = 0; i < count; i += 1) {
    await expect(reveal).toBeVisible();
    await reveal.click();
  }
  await page.getByRole("banner").getByRole("link", { name: "MemDeck" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: headingName })
  ).toHaveCount(0);
}

// Read the most-recent persisted SessionRecord. The auto-started open session
// finalizes on unmount — useSessionAutoSave's cleanup calls tryFinalizeSession
// synchronously when we navigate away — but poll anyway so the helper tolerates
// async finalize paths too. History is plain JSON under SESSION_HISTORY_KEY.
async function latestSessionRecord(page: Page) {
  await expect
    .poll(() =>
      page.evaluate<number, string>((key) => {
        const raw = localStorage.getItem(key);
        return raw === null ? 0 : JSON.parse(raw).length;
      }, SESSION_HISTORY_KEY)
    )
    .toBeGreaterThan(0);
  return page.evaluate<Record<string, unknown> | null, string>((key) => {
    const raw = localStorage.getItem(key);
    if (raw === null) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : null;
  }, SESSION_HISTORY_KEY);
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
          flashcardMode: "cardonly",
          mode: "flashcard",
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
    // A timed suggestion now emits `?timed=` (#697); the mode pages consume it
    // (ACAAN honors only `timed`). Hit the deep link directly to prove the
    // wiring in isolation: the page enables its timer via the canonical setter
    // (persisting it) and strips the param.
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

  test("a ?try= deep-linked session records the preselected mode, not the prior default (#704)", async ({
    page,
  }) => {
    // Seed a DIFFERENT prior mode ("cardonly") so the assertion is red before
    // the fix: pre-fix the auto-started open session captures the prior
    // "cardonly"; post-fix it captures the deep-linked "numberonly". Never seed
    // the deep-linked value itself, or the test passes without testing anything.
    await page.addInitScript(() => {
      localStorage.setItem("memdeck-app-stack", JSON.stringify("mnemonica"));
      localStorage.setItem(
        "memdeck-app-flashcard-option",
        JSON.stringify("cardonly")
      );
    });
    await page.goto("/flashcard/?try=numberonly");
    await expect(page).toHaveURL(STRIPPED_FLASHCARD_URL);

    await completeQuestionsThenLeave(page, 4, "Flashcard");

    const record = await latestSessionRecord(page);
    expect(record).not.toBeNull();
    expect(record?.mode).toBe("flashcard");
    expect(record?.flashcardMode).toBe("numberonly");
  });

  test("a ?timed=1 deep-linked session records timed: true, not the default false (#704)", async ({
    page,
  }) => {
    // The timer defaults to disabled, so the default `timed` is false != the
    // deep link's true — red before the fix, green after.
    await page.addInitScript(() => {
      localStorage.setItem("memdeck-app-stack", JSON.stringify("mnemonica"));
    });
    await page.goto("/flashcard/?timed=1");
    await expect(page).toHaveURL(STRIPPED_FLASHCARD_URL);

    await completeQuestionsThenLeave(page, 4, "Flashcard");

    const record = await latestSessionRecord(page);
    expect(record).not.toBeNull();
    expect(record?.timed).toBe(true);
  });

  test("a ?try= deep-linked distance session records the preselected mode and preserves the other axis (#704)", async ({
    page,
  }) => {
    // Distance is the only two-axis ?try= page (mode + convention). A single
    // ?try= sets just one axis (disjoint guards), so this deep-links the mode and
    // asserts the non-deep-linked convention still records its seeded value —
    // proving both record fields populate, neither silently resets. Seed
    // DIFFERENT priors for both ("both" mode, "signed" convention) so the mode
    // assertion is red before the fix: pre-fix the open session captures the
    // prior "both"; post-fix it captures the deep-linked "apply".
    await page.addInitScript(() => {
      localStorage.setItem("memdeck-app-stack", JSON.stringify("mnemonica"));
      localStorage.setItem(
        "memdeck-app-distance-option",
        JSON.stringify("both")
      );
      localStorage.setItem(
        "memdeck-app-distance-convention",
        JSON.stringify("signed")
      );
    });
    await page.goto("/distance/?try=apply");
    await expect(page).toHaveURL(STRIPPED_DISTANCE_URL);

    await completeQuestionsThenLeave(page, 4, "Distance");

    const record = await latestSessionRecord(page);
    expect(record).not.toBeNull();
    expect(record?.mode).toBe("distance");
    expect(record?.distanceMode).toBe("apply");
    expect(record?.distanceConvention).toBe("signed");
  });

  test("an invalid ?try= value is ignored but auto-start still records the page default (#704)", async ({
    page,
  }) => {
    // A ?try= value matching no enum guard is dropped, but the param is still
    // stripped — so `pending` settles to false and the auto-start must still
    // fire, recording the page default. Guards against a "pending stuck true →
    // session never starts" regression. Seed a known prior so the expected
    // default is explicit rather than relying on the app's built-in default.
    await page.addInitScript(() => {
      localStorage.setItem("memdeck-app-stack", JSON.stringify("mnemonica"));
      localStorage.setItem(
        "memdeck-app-flashcard-option",
        JSON.stringify("cardonly")
      );
    });
    await page.goto("/flashcard/?try=garbage");
    await expect(page).toHaveURL(STRIPPED_FLASHCARD_URL);

    await completeQuestionsThenLeave(page, 4, "Flashcard");

    const record = await latestSessionRecord(page);
    expect(record).not.toBeNull();
    expect(record?.flashcardMode).toBe("cardonly");
  });
});

test.describe("Feature Discovery — post-session summary surface (#698)", () => {
  const SUMMARY_EYEBROW = "Ready for your next challenge?";
  // Seed 3 prior sessions. The summary surface gates on the all-time-stats total;
  // whether that snapshot reflects the pre-completion count (3) or the
  // post-completion count (4 — useLocalDb's getSnapshot re-reads localStorage on
  // the re-render finalizeSession triggers), both land in
  // [DISCOVERY_MIN_SESSIONS (3), SHARE_NUDGE_MIN (5)): the suggestion is eligible
  // and the share nudge stays dormant either way. Seeding 4 is NOT robust — the
  // post-completion read (5) trips the share nudge and suppresses the suggestion.
  const SUMMARY_SEED: Seed = {
    sessions: [0, 1, 2].map((index) =>
      session(`seed-${index}`, { flashcardMode: "cardonly", mode: "flashcard" })
    ),
    totalSessions: 3,
  };

  test("summary 'Try it' preselects the variant AND auto-starts a new session on the same page", async ({
    page,
  }) => {
    await seedDiscoveryState(page, SUMMARY_SEED);
    await page.goto("/flashcard/");

    // Reach the summary modal — the only UI path is a structured session that
    // finalizes. Start one and Stop after a single question (structured sessions
    // persist at questionsCompleted > 0), which transitions to the summary phase.
    await page.getByRole("button", { name: START_A_SESSION_PATTERN }).click();
    await page
      .getByRole("button", { name: START_PRESET_PATTERN })
      .first()
      .click();
    // Confirm the structured session is active before answering (its banner
    // shows "0/N").
    await expect(page.getByLabel(PROGRESS_ZERO_PATTERN)).toBeVisible();
    await page.getByRole("button", { name: "Reveal answer" }).click();
    // Wait for the answer to commit before stopping: stopSession reads the
    // committed status synchronously, so clicking Stop before "1/N" lands would
    // see questionsCompleted = 0 and discard the session instead of summarizing.
    await expect(page.getByLabel(PROGRESS_ONE_PATTERN)).toBeVisible();
    await page.getByRole("button", { name: "Stop" }).click();

    // Confirm the summary modal opened.
    await expect(page.getByText("Session Complete")).toBeVisible();

    // The post-session suggestion renders inside the modal, restricted to the
    // just-played mode (flashcard). A same-mode sub-variant (priority 2) outranks
    // the timed nudge (priority 3), so the CTA always carries a ?try= variant.
    await expect(page.getByText(SUMMARY_EYEBROW)).toBeVisible();
    const tryLink = page.getByRole("link", { name: "Try it" });
    const href = await tryLink.getAttribute("href");
    expect(href).toBeTruthy();
    const variant = new URL(href ?? "", "http://localhost").searchParams.get(
      "try"
    );
    expect(variant).toBeTruthy();

    await tryLink.click();

    // The deep link lands on the SAME already-mounted page and is stripped...
    await expect(page).toHaveURL(STRIPPED_FLASHCARD_URL);

    // ...and — the #698 fix under test — a NEW open session auto-starts in the
    // preselected variant. Without the autoStart re-arm, the page would sit idle
    // here and these Reveals would record nothing (handleAnswer no-ops off an
    // active session). completeQuestionsThenLeave finalizes it on unmount.
    await completeQuestionsThenLeave(page, 4, "Flashcard");

    // The latest persisted record proves both halves: it is an *open* session
    // (a fresh auto-start, not the structured one above) recorded under the
    // *preselected* variant.
    await expect
      .poll(() =>
        page.evaluate<string | null, string>((key) => {
          const raw = localStorage.getItem(key);
          if (raw === null) {
            return null;
          }
          const parsed = JSON.parse(raw);
          const latest =
            Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : null;
          return latest
            ? `${latest.config?.type}:${latest.flashcardMode ?? ""}`
            : null;
        }, SESSION_HISTORY_KEY)
      )
      .toBe(`open:${variant}`);
  });
});
