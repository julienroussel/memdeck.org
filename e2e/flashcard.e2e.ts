import { expect } from "@playwright/test";
import { test } from "./fixtures/test-setup";

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
    await page.waitForLoadState("networkidle");

    // Navigate to flashcard page
    await page.locator("a:has-text('Flashcard')").first().click();
    await page.waitForLoadState("networkidle");
  });

  test("should load flashcard page with default card", async ({ page }) => {
    // Verify page loaded
    await expect(page.locator("text=Flashcard")).toBeVisible();

    // Verify score badges are displayed (thumbs up/down icons with numbers)
    // Score is shown as badges with "0" text initially
    const scoreBadges = page.locator(".mantine-Badge-root");
    await expect(scoreBadges).toHaveCount(2);

    // Both badges should show 0 initially
    await expect(scoreBadges.first()).toContainText("0");
    await expect(scoreBadges.last()).toContainText("0");
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

  test("should display card in card-only mode by default", async ({ page }) => {
    // In default both modes, a card image or number card should be visible
    // Card spread items are always present, so wait for those as a reliable indicator
    await expect(page.locator(".cardSpreadCard").first()).toBeVisible();

    // Look for either a card image or number card - one should be visible
    const cardImage = page.locator("img[src*='cards/']").first();
    const numberCard = page.locator("[class*='numberCard']");

    const hasCard = await cardImage.isVisible().catch(() => false);
    const hasNumber = (await numberCard.count()) > 0;

    expect(hasCard || hasNumber).toBeTruthy();
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
    const scoreBadges = page.locator(".mantine-Badge-root");
    const initialSuccess = await scoreBadges.first().textContent();
    const initialFails = await scoreBadges.last().textContent();

    // Click on a choice - could be card spread with numbers or cards
    // The choices are in the card spread at the bottom
    const cardSpreadItems = page.locator(".cardSpreadCard");
    const itemCount = await cardSpreadItems.count();

    if (itemCount > 0) {
      // Click on the last choice item (less likely to be overlapped by others)
      // Use force:true because card spread items overlap each other visually
      await cardSpreadItems.last().click({ force: true });
    }

    // Score should have changed - one of the badges should now show 1
    await expect(async () => {
      const newSuccess = await scoreBadges.first().textContent();
      const newFails = await scoreBadges.last().textContent();
      const scoreChanged =
        newSuccess !== initialSuccess || newFails !== initialFails;
      expect(scoreChanged).toBeTruthy();
    }).toPass();
  });

  test("should update score when correct answer is selected", async ({
    page,
  }) => {
    // Verify initial score badges show 0
    const scoreBadges = page.locator(".mantine-Badge-root");
    await expect(scoreBadges.first()).toContainText("0");

    // Make multiple selections to increase score
    for (let i = 0; i < 3; i++) {
      await expect(page.locator(".cardSpreadCard").first()).toBeVisible();

      // Click on a choice from the card spread
      // Use force:true because card spread items overlap each other visually
      const cardSpreadItems = page.locator(".cardSpreadCard");
      if ((await cardSpreadItems.count()) > 0) {
        await cardSpreadItems.last().click({ force: true });
      }
    }

    // Score should have increased - at least one badge should show a non-zero value
    await expect(async () => {
      const successText = await scoreBadges.first().textContent();
      const failsText = await scoreBadges.last().textContent();
      const totalScore =
        Number.parseInt(successText || "0", 10) +
        Number.parseInt(failsText || "0", 10);
      expect(totalScore).toBeGreaterThan(0);
    }).toPass();
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
    const mode = await page.evaluate(() => {
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
    const mode = await page.evaluate(() => {
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
    const mode = await page.evaluate(() => {
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
    const mode = await page.evaluate(() => {
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
    const mode = await page.evaluate(() => {
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
    const scoreBadges = page.locator(".mantine-Badge-root");
    await expect(scoreBadges.first()).toContainText("0");
    await expect(scoreBadges.last()).toContainText("0");

    // Should be able to answer correctly (game state is valid)
    await expect(page.locator(".cardSpreadCard").first()).toBeVisible();
    const cardSpreadItems = page.locator(".cardSpreadCard");
    if ((await cardSpreadItems.count()) > 0) {
      await cardSpreadItems.last().click({ force: true });
    }

    // Score should have changed (answer was registered)
    await expect(async () => {
      const successText = await scoreBadges.first().textContent();
      const failsText = await scoreBadges.last().textContent();
      const totalScore =
        Number.parseInt(successText || "0", 10) +
        Number.parseInt(failsText || "0", 10);
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
    const scoreBadges = page.locator(".mantine-Badge-root");
    await expect(async () => {
      const successText = await scoreBadges.first().textContent();
      const failsText = await scoreBadges.last().textContent();
      const totalScore =
        Number.parseInt(successText || "0", 10) +
        Number.parseInt(failsText || "0", 10);
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
    await expect(scoreBadges.first()).toContainText("0");
    await expect(scoreBadges.last()).toContainText("0");

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
    await page.locator("a:has-text('Home')").first().click();
    await page.waitForLoadState("networkidle");

    // Navigate back to flashcard
    await page.locator("a:has-text('Flashcard')").first().click();
    await page.waitForLoadState("networkidle");

    // Page should load correctly with score badges and flashcard content
    const scoreBadges = page.locator(".mantine-Badge-root");
    await expect(scoreBadges).toHaveCount(2);

    // Flashcard title should be visible (use heading role to be specific)
    await expect(
      page.getByRole("heading", { name: "Flashcard" })
    ).toBeVisible();

    // Card spread should be visible
    const cardSpreadItems = page.locator(".cardSpreadCard");
    const itemCount = await cardSpreadItems.count();
    expect(itemCount).toBeGreaterThan(0);
  });
});
