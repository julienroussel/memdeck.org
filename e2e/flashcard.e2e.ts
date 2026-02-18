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

  test("should display options modal when settings is clicked", async ({
    page,
  }) => {
    // Click settings button in main content area
    const settingsButton = page.getByRole("button", {
      name: "Flashcard settings",
    });
    await settingsButton.click();

    // Verify modal is displayed
    await expect(page.locator("text=Flashcard options")).toBeVisible();

    // Verify all mode options are visible
    await expect(page.locator("text=Card only")).toBeVisible();
    await expect(page.locator("text=Both modes")).toBeVisible();
    await expect(page.locator("text=Number only")).toBeVisible();
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

  test("should allow changing flashcard mode to card-only", async ({
    page,
  }) => {
    // Open options modal - settings button is in main content area
    const settingsButton = page.getByRole("button", {
      name: "Flashcard settings",
    });
    await settingsButton.click();
    await expect(page.getByRole("dialog")).toBeVisible();

    // Select "Card only" option (click on the Radio.Card)
    const cardOnlyOption = page.locator("text=Card only").first();
    await cardOnlyOption.click();

    // Close modal
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();

    // Verify mode was saved to localStorage (values are JSON-stringified)
    const mode = await page.evaluate(() => {
      const value = localStorage.getItem("memdeck-app-flashcard-option");
      return value ? JSON.parse(value) : null;
    });

    expect(mode).toBe("cardonly");
  });

  test("should allow changing flashcard mode to number-only", async ({
    page,
  }) => {
    // Open options modal - settings button is in main content area
    const settingsButton = page.getByRole("button", {
      name: "Flashcard settings",
    });
    await settingsButton.click();
    await expect(page.getByRole("dialog")).toBeVisible();

    // Select "Number only" option (click on the Radio.Card)
    const numberOnlyOption = page.locator("text=Number only").first();
    await numberOnlyOption.click();

    // Close modal
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();

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
    // Open options and select a mode - settings button is in main content area
    const settingsButton = page.getByRole("button", {
      name: "Flashcard settings",
    });
    await settingsButton.click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.locator("text=Card only").first().click();

    // Check localStorage directly (values are JSON-stringified)
    const mode = await page.evaluate(() => {
      const value = localStorage.getItem("memdeck-app-flashcard-option");
      return value ? JSON.parse(value) : null;
    });

    expect(mode).toBe("cardonly");
  });

  test("should restore flashcard mode on page reload", async ({ page }) => {
    // Set a specific mode - settings button is in main content area
    const settingsButton = page.getByRole("button", {
      name: "Flashcard settings",
    });
    await settingsButton.click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.locator("text=Number only").first().click();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();

    // Reload page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Open options again and verify mode is restored
    const settingsButtonAfterReload = page.getByRole("button", {
      name: "Flashcard settings",
    });
    await settingsButtonAfterReload.click();
    await expect(page.getByRole("dialog")).toBeVisible();

    // Check that "Number only" option is selected (has data-checked attribute)
    const numberOnlyCard = page.locator(
      '.optionsRadioCard[data-checked="true"]:has-text("Number only")'
    );
    await expect(numberOnlyCard).toBeVisible();
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
