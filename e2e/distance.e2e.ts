import { expect } from "@playwright/test";
import { STACK_LIMITS_LSK } from "../src/constants";
import { test } from "./fixtures/test-setup";

const RANGE_TOO_SMALL_TEXT_REGEX = /Distance training needs at least 6 cards/;

test.describe("Distance Number Training", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page
      .locator("[data-testid='stack-picker']")
      .first()
      .selectOption("mnemonica");
    await page.waitForLoadState("networkidle");

    await page.goto("/distance/");
    await page.waitForLoadState("networkidle");
  });

  test("loads the distance page with title and zeroed score badges", async ({
    page,
  }) => {
    await expect(page.getByRole("heading", { name: "Distance" })).toBeVisible();
    await expect(page.getByTestId("score-success")).toContainText("0");
    await expect(page.getByTestId("score-fail")).toContainText("0");
  });

  test("opens the settings popover with mode + convention selectors", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Distance settings" }).click();

    const modeSelector = page.getByRole("radiogroup", {
      name: "Distance mode",
    });
    await expect(modeSelector).toBeVisible();
    await expect(modeSelector.getByText("Compute")).toBeVisible();
    await expect(modeSelector.getByText("Apply")).toBeVisible();
    await expect(modeSelector.getByText("Both")).toBeVisible();

    const conventionSelector = page.getByRole("radiogroup", {
      name: "Distance convention",
    });
    await expect(conventionSelector).toBeVisible();
    await expect(conventionSelector.getByText("Cyclic")).toBeVisible();
    await expect(conventionSelector.getByText("Signed")).toBeVisible();
  });

  test("renders prompt cards and choices on first load", async ({ page }) => {
    // Default mode is 'both' which alternates between compute and apply
    // rounds. Either variant must produce a prompt card; a regression that
    // mounts the wrong prompt shape (e.g. silently empty) would otherwise
    // pass a generic spread-count assertion. We assert the prompt-card
    // testid AND a choice spread of at least 5 items, which is the minimum
    // produced by either compute or apply rounds.
    await expect(page.getByTestId("distance-prompt-card")).toBeVisible();
    await expect(page.locator(".cardSpreadCard").first()).toBeVisible();
    const cardCount = await page.locator(".cardSpreadCard").count();
    expect(cardCount).toBeGreaterThanOrEqual(5);
  });

  test("switching to compute mode produces two prompt cards", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Distance settings" }).click();
    const modeSelector = page.getByRole("radiogroup", {
      name: "Distance mode",
    });
    await modeSelector.getByText("Compute").click();
    // Close the popover (click outside)
    await page.locator("body").click({ position: { x: 10, y: 10 } });

    await expect(page.getByTestId("distance-prompt-card")).toBeVisible();
    await expect(page.getByTestId("distance-target-card")).toBeVisible();
  });

  test("switching to apply mode produces a single prompt card and an offset badge", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Distance settings" }).click();
    const modeSelector = page.getByRole("radiogroup", {
      name: "Distance mode",
    });
    await modeSelector.getByText("Apply").click();
    await page.locator("body").click({ position: { x: 10, y: 10 } });

    await expect(page.getByTestId("distance-prompt-card")).toBeVisible();
    await expect(page.getByTestId("distance-offset-badge")).toBeVisible();
    await expect(page.getByTestId("distance-target-card")).toHaveCount(0);
  });

  test("clicking choices exercises both correct and incorrect score paths", async ({
    page,
  }) => {
    // Click multiple choices across rounds so we observe BOTH the success
    // and fail badges incrementing at least once. The previous assertion
    // (any single counter changed) would silently pass even if every click
    // registered as the same outcome, hiding a regression where one of the
    // two paths is broken (e.g. isCorrectAnswer always returns true/false).
    await expect(page.locator(".cardSpreadCard").first()).toBeVisible();

    const successBadge = page.getByTestId("score-success");
    const failBadge = page.getByTestId("score-fail");
    const cardSpreadItems = page.locator(".cardSpreadCard");

    // The correct-answer position is at some index in [0, itemCount-1].
    // Cycling through every position guarantees at least one correct hit
    // per round, which deterministically advances the round counter and
    // accumulates fails on the same-round wrong clicks. ATTEMPTS must be
    // >= itemCount for the cycle to cover every position; the explicit
    // assertion below guards against a future change to the spread size
    // breaking that guarantee.
    const itemCount = await cardSpreadItems.count();
    expect(itemCount).toBeGreaterThan(0);
    const ATTEMPTS = 8;
    expect(itemCount).toBeLessThanOrEqual(ATTEMPTS);

    for (let i = 0; i < ATTEMPTS; i++) {
      // Capture the score total before clicking. Every click submits an
      // answer that dispatches either CORRECT_ANSWER (successes+1) or
      // WRONG_ANSWER (fails+1), so successes+fails is monotonic per click.
      const beforeSuccess = Number(await successBadge.textContent()) || 0;
      const beforeFail = Number(await failBadge.textContent()) || 0;
      const beforeTotal = beforeSuccess + beforeFail;

      // dispatchEvent fires the click directly on the button regardless of
      // what's visually on top. Two overlays can intercept a coordinate-
      // based click here: (1) sibling spread cards overlap each other in
      // the fan-out (the original reason for force:true), and (2) the
      // wrong-answer notification toasts accumulate over the loop and can
      // sit over the spread. force:true bypassed Playwright's actionability
      // check but the click event still went to whatever element was at the
      // click coordinates; dispatchEvent bypasses hit-testing entirely.
      await cardSpreadItems.nth(i % itemCount).dispatchEvent("click");

      // Positive render signal: wait for the next render's commit to flush
      // by observing the score badges advance. The Score component shares
      // useDistanceGame state with the prompt/spread, so once the badge
      // text reflects the new total the resulting state (whether the round
      // advanced or not) is already mounted. Replaces a flaky fixed 120ms
      // wait that let the next click race the React re-render under CI load.
      await expect
        .poll(async () => {
          const success = Number(await successBadge.textContent()) || 0;
          const fail = Number(await failBadge.textContent()) || 0;
          return success + fail;
        })
        .toBeGreaterThan(beforeTotal);
    }

    await expect(async () => {
      const successCount = Number(await successBadge.textContent());
      const failCount = Number(await failBadge.textContent());
      // At least one of each path must have happened. If a regression makes
      // every click score the same way, this fails loudly.
      expect(successCount).toBeGreaterThan(0);
      expect(failCount).toBeGreaterThan(0);
    }).toPass();
  });

  test("shows the range-too-small banner when limits are set to fewer than 6 cards", async ({
    page,
  }) => {
    // Set the stack range to 1..5 directly via localStorage. The Stack Range
    // slider has no preset for under 6 cards, so this is the simplest path.
    await page.evaluate(
      ([key, value]) => {
        window.localStorage.setItem(key, value);
      },
      [
        STACK_LIMITS_LSK,
        JSON.stringify({ mnemonica: { start: 1, end: 5 } }),
      ] as const
    );

    await page.reload();
    await page.waitForLoadState("networkidle");

    await expect(page.getByText(RANGE_TOO_SMALL_TEXT_REGEX)).toBeVisible();
    await expect(page.locator(".cardSpreadCard")).toHaveCount(0);
  });
});
