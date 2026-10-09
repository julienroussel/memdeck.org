import { expect } from "@playwright/test";
import {
  CORRECT_ANSWERS_PATTERN,
  INCORRECT_ANSWERS_PATTERN,
} from "./fixtures/patterns";
import { readCount } from "./fixtures/read-count";
import { test } from "./fixtures/test-setup";

const CARD_IMAGE_SRC_PATTERN = /cards\//;

test.describe("Flashcard Training", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home and select a stack before each test
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Select Mnemonica stack
    await page
      .locator("[data-testid='stack-picker']")
      .first()
      .selectOption("mnemonica");

    // Navigate to flashcard page
    await page.locator("#main-nav a:has-text('Flashcard')").click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Flashcard" })
    ).toBeVisible();
  });

  test("should load flashcard page with default card", async ({ page }) => {
    // Verify page loaded
    await expect(
      page.getByRole("heading", { name: "Flashcard" })
    ).toBeVisible();

    // Verify score badges are displayed (thumbs up/down icons with numbers)
    // Score is shown as badges with "0" text initially
    const scoreBadges = page.locator("main .mantine-Badge-root");
    await expect(scoreBadges).toHaveCount(2);

    // Both badges should show 0 initially
    await expect(page.getByText(CORRECT_ANSWERS_PATTERN)).toHaveText(
      "Correct answers: 0"
    );
    await expect(page.getByText(INCORRECT_ANSWERS_PATTERN)).toHaveText(
      "Incorrect answers: 0"
    );
  });

  test("should display settings button on flashcard page", async ({ page }) => {
    // Find settings button in main content area (near the score badges)
    const settingsButton = page.getByRole("button", {
      name: "Flashcard settings",
    });
    await expect(settingsButton).toBeVisible();
  });

  test("should display mode selectors in settings popover", async ({
    page,
  }) => {
    // Open settings popover
    await page.getByRole("button", { name: "Flashcard settings" }).click();

    // Verify primary mode selector is visible with Position and Neighbor options
    const primarySelector = page.getByRole("radiogroup", {
      name: "Training mode",
    });
    await expect(primarySelector).toBeVisible();

    // Verify Position and Neighbor labels are visible
    await expect(primarySelector.getByText("Position")).toBeVisible();
    await expect(primarySelector.getByText("Neighbor")).toBeVisible();

    // Verify secondary selector is visible (defaults to position sub-mode)
    const secondarySelector = page.getByRole("radiogroup", {
      name: "Position mode variant",
    });
    await expect(secondarySelector).toBeVisible();
    await expect(secondarySelector.getByText("Card")).toBeVisible();
    await expect(secondarySelector.getByText("Number")).toBeVisible();
    await expect(secondarySelector.getByText("Both")).toBeVisible();
  });

  test("should default to the Both position sub-mode", async ({ page }) => {
    await expect(page.locator(".cardSpreadCard").first()).toBeVisible();

    await page.getByRole("button", { name: "Flashcard settings" }).click();
    const secondarySelector = page.getByRole("radiogroup", {
      name: "Position mode variant",
    });
    await expect(
      secondarySelector.getByRole("radio", { exact: true, name: "Both" })
    ).toBeChecked();
  });

  test("should display choice cards or numbers for user to select from", async ({
    page,
  }) => {
    // Should have at least 5 choice items visible
    const allCards = page.locator("img[src*='cards/']");
    const allNumbers = page.locator("[class*='numberCard']");

    await expect(async () => {
      const cardCount = await allCards.count();
      const numberCount = await allNumbers.count();
      expect(cardCount + numberCount).toBeGreaterThanOrEqual(5);
    }).toPass();
  });

  test("should allow selecting an answer by clicking on a card choice", async ({
    page,
  }) => {
    // Wait for card spread to render
    await expect(page.locator(".cardSpreadCard").first()).toBeVisible();

    // Get initial score from badges
    const successBadge = page.getByText(CORRECT_ANSWERS_PATTERN);
    const failBadge = page.getByText(INCORRECT_ANSWERS_PATTERN);
    const initialSuccess = await readCount(successBadge);
    const initialFails = await readCount(failBadge);

    // Click on a choice - could be card spread with numbers or cards
    // The choices are in the card spread at the bottom
    const cardSpreadItems = page.locator(".cardSpreadCard");
    // Click on the last choice item (less likely to be overlapped by others)
    // Use force:true because card spread items overlap each other visually
    await cardSpreadItems.last().click({ force: true });

    // Score should have changed - one of the badges should now show 1
    await expect(async () => {
      const newSuccess = await readCount(successBadge);
      const newFails = await readCount(failBadge);
      const scoreChanged =
        newSuccess !== initialSuccess || newFails !== initialFails;
      expect(scoreChanged).toBeTruthy();
    }).toPass();
  });

  test("should update score when correct answer is selected", async ({
    page,
  }) => {
    const successBadge = page.getByText(CORRECT_ANSWERS_PATTERN);
    const failBadge = page.getByText(INCORRECT_ANSWERS_PATTERN);
    await expect(successBadge).toHaveText("Correct answers: 0");
    await expect(failBadge).toHaveText("Incorrect answers: 0");

    // The prompt renders both its card image and its position (one hidden), so
    // the correct choice is the spread item matching either: a number choice
    // when the card is shown, a card choice when the position is shown.
    const spreadItems = page.locator(".cardSpreadCard");
    await expect(spreadItems.first()).toBeVisible();
    const promptImage = page.locator("img.cardShadow");
    await expect(promptImage).toHaveAttribute("src", CARD_IMAGE_SRC_PATTERN);
    const promptSrc = await promptImage.getAttribute("src");
    const promptPosition = await page
      .getByTestId("number-card-value")
      .first()
      .textContent();
    expect(promptSrc).toBeTruthy();
    expect(promptPosition).toBeTruthy();

    const correctChoice = spreadItems
      .filter({ has: page.locator(`img[src="${promptSrc}"]`) })
      .or(
        spreadItems.filter({
          has: page.getByTestId("number-card-value").filter({
            hasText: new RegExp(`^${promptPosition}$`),
          }),
        })
      );
    // Spread items overlap, so a coordinate click can land on a neighbour;
    // keyboard activation targets this exact button.
    await correctChoice.press("Enter");

    await expect(successBadge).toHaveText("Correct answers: 1");
    await expect(failBadge).toHaveText("Incorrect answers: 0");
  });

  test("should allow changing flashcard mode to card-only via settings popover", async ({
    page,
  }) => {
    // Open settings popover
    await page.getByRole("button", { name: "Flashcard settings" }).click();

    // Click "Card" in the position sub-mode selector
    const secondarySelector = page.getByRole("radiogroup", {
      name: "Position mode variant",
    });
    await secondarySelector.getByText("Card").click();

    // Verify mode was saved to localStorage (values are JSON-stringified)
    const mode = await page.evaluate((): unknown => {
      const value = localStorage.getItem("memdeck-app-flashcard-option");
      return value ? JSON.parse(value) : null;
    });

    expect(mode).toBe("cardonly");
  });

  test("should allow changing flashcard mode to number-only via settings popover", async ({
    page,
  }) => {
    // Open settings popover
    await page.getByRole("button", { name: "Flashcard settings" }).click();

    // Click "Number" in the position sub-mode selector
    const secondarySelector = page.getByRole("radiogroup", {
      name: "Position mode variant",
    });
    await secondarySelector.getByText("Number").click();

    // Verify mode was saved to localStorage (values are JSON-stringified)
    const mode = await page.evaluate((): unknown => {
      const value = localStorage.getItem("memdeck-app-flashcard-option");
      return value ? JSON.parse(value) : null;
    });

    expect(mode).toBe("numberonly");
  });

  test("should persist flashcard mode selection in localStorage", async ({
    page,
  }) => {
    // Open settings popover
    await page.getByRole("button", { name: "Flashcard settings" }).click();

    // Click "Card" in the position sub-mode selector
    const secondarySelector = page.getByRole("radiogroup", {
      name: "Position mode variant",
    });
    await secondarySelector.getByText("Card").click();

    // Check localStorage directly (values are JSON-stringified)
    const mode = await page.evaluate((): unknown => {
      const value = localStorage.getItem("memdeck-app-flashcard-option");
      return value ? JSON.parse(value) : null;
    });

    expect(mode).toBe("cardonly");
  });

  test("should restore flashcard mode on page reload", async ({ page }) => {
    // Open settings popover and set number-only mode
    await page.getByRole("button", { name: "Flashcard settings" }).click();

    const secondarySelector = page.getByRole("radiogroup", {
      name: "Position mode variant",
    });
    await secondarySelector.getByText("Number").click();

    // Close popover
    await page.getByRole("button", { name: "Flashcard settings" }).click();

    // Reload page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Open settings popover again to verify "Number" segment is active
    await page.getByRole("button", { name: "Flashcard settings" }).click();

    const reloadedSelector = page.getByRole("radiogroup", {
      name: "Position mode variant",
    });
    await expect(reloadedSelector).toBeVisible();

    // Verify localStorage still has the correct value
    const mode = await page.evaluate((): unknown => {
      const value = localStorage.getItem("memdeck-app-flashcard-option");
      return value ? JSON.parse(value) : null;
    });
    expect(mode).toBe("numberonly");
  });

  test("should switch to neighbor mode and show direction selector", async ({
    page,
  }) => {
    // Open settings popover
    await page.getByRole("button", { name: "Flashcard settings" }).click();

    // Click "Neighbor" in the primary selector
    const primarySelector = page.getByRole("radiogroup", {
      name: "Training mode",
    });
    await primarySelector.getByText("Neighbor").click();

    // Verify the direction selector appears
    const directionSelector = page.getByRole("radiogroup", {
      name: "Neighbor direction",
    });
    await expect(directionSelector).toBeVisible();

    // Verify mode was saved to localStorage
    const mode = await page.evaluate((): unknown => {
      const value = localStorage.getItem("memdeck-app-flashcard-option");
      return value ? JSON.parse(value) : null;
    });
    expect(mode).toBe("neighbor");
  });

  test("should display a direction arrow in neighbor mode with fixed direction", async ({
    page,
  }) => {
    // Set neighbor mode with "before" direction via localStorage
    await page.evaluate(() => {
      localStorage.setItem(
        "memdeck-app-flashcard-option",
        JSON.stringify("neighbor")
      );
      localStorage.setItem(
        "memdeck-app-neighbor-direction",
        JSON.stringify("before")
      );
    });
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Use aria-label locators since getByRole('img') skips visibility:hidden elements
    const beforeArrow = page.locator("[aria-label='Card before']");
    const afterArrow = page.locator("[aria-label='Card after']");

    await expect(beforeArrow).toBeAttached();
    await expect(afterArrow).toBeAttached();
    await expect(beforeArrow).toHaveCSS("visibility", "visible");
    await expect(afterArrow).toHaveCSS("visibility", "hidden");
  });

  test("should display a direction arrow in neighbor mode with 'after' direction", async ({
    page,
  }) => {
    await page.evaluate(() => {
      localStorage.setItem(
        "memdeck-app-flashcard-option",
        JSON.stringify("neighbor")
      );
      localStorage.setItem(
        "memdeck-app-neighbor-direction",
        JSON.stringify("after")
      );
    });
    await page.reload();
    await page.waitForLoadState("networkidle");

    const beforeArrow = page.locator("[aria-label='Card before']");
    const afterArrow = page.locator("[aria-label='Card after']");

    await expect(beforeArrow).toBeAttached();
    await expect(afterArrow).toBeAttached();
    await expect(beforeArrow).toHaveCSS("visibility", "hidden");
    await expect(afterArrow).toHaveCSS("visibility", "visible");
  });

  test("should display an arrow in neighbor mode with random direction", async ({
    page,
  }) => {
    await page.evaluate(() => {
      localStorage.setItem(
        "memdeck-app-flashcard-option",
        JSON.stringify("neighbor")
      );
      localStorage.setItem(
        "memdeck-app-neighbor-direction",
        JSON.stringify("random")
      );
    });
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Both arrow elements should be attached; exactly one should be visible
    const beforeArrow = page.locator("[aria-label='Card before']");
    const afterArrow = page.locator("[aria-label='Card after']");
    await expect(beforeArrow).toBeAttached();
    await expect(afterArrow).toBeAttached();

    const beforeVis = await beforeArrow.evaluate(
      (el) => getComputedStyle(el).visibility
    );
    const afterVis = await afterArrow.evaluate(
      (el) => getComputedStyle(el).visibility
    );
    expect((beforeVis === "visible") !== (afterVis === "visible")).toBe(true);
  });

  test("should not display arrows in position mode", async ({ page }) => {
    // Default mode is "bothmodes" (position), so no arrows
    const beforeArrow = page.getByRole("img", { name: "Card before" });
    const afterArrow = page.getByRole("img", { name: "Card after" });

    await expect(beforeArrow).toHaveCount(0);
    await expect(afterArrow).toHaveCount(0);
  });

  test("should reset game when switching from neighbor to position mode", async ({
    page,
  }) => {
    // Start in neighbor mode
    await page.evaluate(() => {
      localStorage.setItem(
        "memdeck-app-flashcard-option",
        JSON.stringify("neighbor")
      );
      localStorage.setItem(
        "memdeck-app-neighbor-direction",
        JSON.stringify("before")
      );
    });
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Verify we're in neighbor mode (arrow visible)
    await expect(page.getByRole("img", { name: "Card before" })).toBeAttached();

    // Open settings and switch to Position mode
    await page.getByRole("button", { name: "Flashcard settings" }).click();
    const primarySelector = page.getByRole("radiogroup", {
      name: "Training mode",
    });
    await primarySelector.getByText("Position").click();
    await page.getByRole("button", { name: "Flashcard settings" }).click();

    // Arrows should no longer be present
    await expect(page.getByRole("img", { name: "Card before" })).toHaveCount(0);
    await expect(page.getByRole("img", { name: "Card after" })).toHaveCount(0);

    // Score should be reset to 0/0
    const successBadge = page.getByText(CORRECT_ANSWERS_PATTERN);
    const failBadge = page.getByText(INCORRECT_ANSWERS_PATTERN);
    await expect(successBadge).toHaveText("Correct answers: 0");
    await expect(failBadge).toHaveText("Incorrect answers: 0");

    // Should be able to answer correctly (game state is valid)
    await expect(page.locator(".cardSpreadCard").first()).toBeVisible();
    await page.locator(".cardSpreadCard").last().click({ force: true });

    // Score should have changed (answer was registered)
    await expect(async () => {
      const totalScore =
        (await readCount(successBadge)) + (await readCount(failBadge));
      expect(totalScore).toBeGreaterThan(0);
    }).toPass();
  });

  test("should reset game when switching from position to neighbor mode", async ({
    page,
  }) => {
    // Start in default position mode, answer a few questions
    await expect(page.locator(".cardSpreadCard").first()).toBeVisible();
    await page.locator(".cardSpreadCard").last().click({ force: true });

    // Score should be non-zero
    const successBadge = page.getByText(CORRECT_ANSWERS_PATTERN);
    const failBadge = page.getByText(INCORRECT_ANSWERS_PATTERN);
    await expect(async () => {
      const totalScore =
        (await readCount(successBadge)) + (await readCount(failBadge));
      expect(totalScore).toBeGreaterThan(0);
    }).toPass();

    // Switch to neighbor mode
    await page.getByRole("button", { name: "Flashcard settings" }).click();
    const primarySelector = page.getByRole("radiogroup", {
      name: "Training mode",
    });
    await primarySelector.getByText("Neighbor").click();
    await page.getByRole("button", { name: "Flashcard settings" }).click();

    // Score should be reset to 0/0
    await expect(successBadge).toHaveText("Correct answers: 0");
    await expect(failBadge).toHaveText("Incorrect answers: 0");

    // Both arrow elements should now be attached (one visible, one hidden)
    const beforeArrow = page.locator("[aria-label='Card before']");
    const afterArrow = page.locator("[aria-label='Card after']");
    await expect(beforeArrow).toBeAttached();
    await expect(afterArrow).toBeAttached();
  });

  test("should navigate away from flashcard and return to see working page", async ({
    page,
  }) => {
    // Navigate away
    await page.locator("#main-nav a:has-text('Home')").click();
    await expect(
      page.getByRole("heading", { name: "Ready to train?" })
    ).toBeVisible();

    // Navigate back to flashcard
    await page.locator("#main-nav a:has-text('Flashcard')").click();

    // Page should load correctly with score badges and flashcard content
    const scoreBadges = page.locator("main .mantine-Badge-root");
    await expect(scoreBadges).toHaveCount(2);

    // Flashcard title should be visible (use heading role to be specific)
    await expect(
      page.getByRole("heading", { name: "Flashcard" })
    ).toBeVisible();

    // Card spread should be visible
    await expect(page.locator(".cardSpreadCard")).not.toHaveCount(0);
  });
});
