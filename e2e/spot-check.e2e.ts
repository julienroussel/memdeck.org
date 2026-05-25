import { expect } from "@playwright/test";
import { SPOT_CHECK_MODE_LSK } from "../src/constants";
import { test } from "./fixtures/test-setup";

const SWAPPED_CARDS_PATTERN = /swapped cards/i;

test.describe("Spot Check Training", () => {
  test.beforeEach(async ({ page }) => {
    // Pre-select Mnemonica stack before navigating to spot-check, otherwise
    // the `RequireStack` guard redirects to home.
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page
      .locator("[data-testid='stack-picker']")
      .first()
      .selectOption("mnemonica");
    await page.waitForLoadState("networkidle");

    // Force the spot-check mode deterministically. Without this the mode
    // defaults to "missing" but a regression could flip it; pinning the mode
    // makes the test's variant-specific assertions robust.
    await page.evaluate(
      ([key, value]) => {
        window.localStorage.setItem(key, value);
      },
      [SPOT_CHECK_MODE_LSK, JSON.stringify("missing")] as const
    );

    await page.goto("/spot-check/");
    await page.waitForLoadState("networkidle");
  });

  test("loads the spot-check page with title, instruction, and card spread", async ({
    page,
  }) => {
    // Title heading
    await expect(
      page.getByRole("heading", { name: "Spot Check" })
    ).toBeVisible();

    // Score badges start at zero — Spot Check uses auto-start "open" sessions,
    // and the Score component is rendered for non-structured sessions.
    const successBadge = page.getByTestId("score-success");
    const failBadge = page.getByTestId("score-fail");
    await expect(successBadge).toContainText("0");
    await expect(failBadge).toContainText("0");

    // Mode-specific instruction text (missing variant — pinned via localStorage
    // in beforeEach). The exact i18n key is `spotCheck.identifyMissing`.
    await expect(page.getByText("Tap next to the gap")).toBeVisible();

    // Card spread renders for the puzzle.
    await expect(page.locator(".cardSpreadCard").first()).toBeVisible();
    const cardCount = await page.locator(".cardSpreadCard").count();
    // For "missing" mode on full mnemonica deck (52 cards), one card is removed
    // so 51 should remain visible.
    expect(cardCount).toBe(51);
  });

  test("surfaces a notification and updates the score when a card in the spread is tapped", async ({
    page,
  }) => {
    // Tap on a spread item; whichever variant of feedback fires (correct or
    // wrong), Mantine renders a notification with role="alert". The probability
    // of hitting one of the two correct positions in "missing" mode on 51
    // cards is low (~4%), but we don't depend on the outcome — the contract
    // is: tap → notification shows AND the score advances by exactly one.
    await expect(page.locator(".cardSpreadCard").first()).toBeVisible();

    const successBadge = page.getByTestId("score-success");
    const failBadge = page.getByTestId("score-fail");
    const cardSpreadItems = page.locator(".cardSpreadCard");

    // dispatchEvent fires the click directly on the button regardless of
    // visual overlap (sibling spread cards overlap each other in the fan-out,
    // and prior wrong-answer notifications can sit over the spread). Mirrors
    // the distance.e2e.ts choice-click pattern.
    await cardSpreadItems.first().dispatchEvent("click");

    // A Mantine notification must appear — either green "Correct!" or red
    // "Wrong — try again". `role="alert"` matches both.
    await expect(page.getByRole("alert").first()).toBeVisible();

    // This e2e is intentionally branch-agnostic: in 'missing' mode the success
    // probability is ~1/51, so a green/red split assertion would be flaky.
    // The success branch is pinned at the hook level in
    // src/pages/spot-check/use-spot-check-game.test.ts.
    // Score should advance by exactly one (either success+1 or fail+1).
    await expect
      .poll(async () => {
        const successText = (await successBadge.textContent()) ?? "0";
        const failText = (await failBadge.textContent()) ?? "0";
        return Number(successText) + Number(failText);
      })
      .toBe(1);
  });

  test("can navigate away to home and back to spot-check with state intact", async ({
    page,
  }) => {
    // Tap once so the page has answered at least one question.
    await expect(page.locator(".cardSpreadCard").first()).toBeVisible();
    await page.locator(".cardSpreadCard").first().dispatchEvent("click");

    // Navigate away to home via the nav link.
    await page.locator("#main-nav a:has-text('Home')").click();
    await page.waitForLoadState("networkidle");

    // Back to spot-check. A fresh navigation should mount the page cleanly
    // (the prior auto-save flushes on unmount, so the new mount auto-starts a
    // fresh "open" session with score reset to zero).
    await page.goto("/spot-check/");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: "Spot Check" })
    ).toBeVisible();
    await expect(page.getByTestId("score-success")).toContainText("0");
    await expect(page.getByTestId("score-fail")).toContainText("0");
    await expect(page.locator(".cardSpreadCard").first()).toBeVisible();
  });

  test("switching the spot-check mode in settings persists to localStorage", async ({
    page,
  }) => {
    // Open the settings popover.
    await page.getByRole("button", { name: "Spot Check settings" }).click();

    // Mantine Radio.Group renders the radios with role="radio"; the
    // accessible name comes from the Radio's `label` prop ("Swapped Cards"
    // here). Click the Swapped Cards radio directly.
    const swappedRadio = page.getByRole("radio", {
      name: SWAPPED_CARDS_PATTERN,
    });
    await expect(swappedRadio).toBeVisible();
    await swappedRadio.click();

    // Verify the mode persisted (JSON-stringified, mirroring useLocalDb).
    const persistedMode = await page.evaluate((key) => {
      const value = window.localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    }, SPOT_CHECK_MODE_LSK);
    expect(persistedMode).toBe("swapped");

    // Instruction text should switch to the swapped variant.
    await expect(page.getByText("Tap either swapped card")).toBeVisible();
  });
});
