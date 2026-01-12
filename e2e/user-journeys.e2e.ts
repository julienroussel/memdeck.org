import { expect } from "@playwright/test";
import { test } from "./fixtures/test-setup";

// URL patterns
const FLASHCARD_URL_PATTERN = /#\/flashcard$/;

test.describe("User Journeys", () => {
  test("should complete first-time user onboarding flow", async ({ page }) => {
    // Load home page - user sees welcome message
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Welcome to MemDeck")).toBeVisible();
    // Use more specific selector for first-timer text
    await expect(
      page.getByText("Hey there, first-timer!", { exact: false })
    ).toBeVisible();

    // User selects a stack
    await page.locator("select").first().selectOption("mnemonica");
    await page.waitForLoadState("networkidle");

    // Verify stack selection persists
    const selectedValue = await page.locator("select").first().inputValue();
    expect(selectedValue).toBe("mnemonica");

    // Stack name should be displayed (mnemonica's display name is "Tamariz")
    await expect(page.getByRole("main").getByText("Tamariz")).toBeVisible();

    // Card spread should be displayed
    const cardImages = page.locator("img[src*='cards/']");
    const count = await cardImages.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // User can now navigate to flashcard
    await page.locator("a:has-text('Flashcard')").first().click();
    await page.waitForLoadState("networkidle");

    // User is on flashcard page
    await expect(page).toHaveURL(FLASHCARD_URL_PATTERN);
    await expect(
      page.getByRole("heading", { name: "Flashcard" })
    ).toBeVisible();
  });

  test("should support typical user training session", async ({ page }) => {
    // User navigates to flashcard training
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Select stack
    await page.locator("select").first().selectOption("aronson");
    await page.waitForLoadState("networkidle");

    // Go to flashcard
    await page.locator("a:has-text('Flashcard')").first().click();
    await page.waitForLoadState("networkidle");

    // Verify training page loaded
    await expect(
      page.getByRole("heading", { name: "Flashcard" })
    ).toBeVisible();
    // Score is shown as badges, verify they exist
    const scoreBadges = page.locator(".mantine-Badge-root");
    await expect(scoreBadges).toHaveCount(2);

    // User practices by clicking answers
    for (let i = 0; i < 5; i++) {
      await page.waitForTimeout(500);

      // Get available choices from card spread (use force:true due to overlapping)
      const cardSpreadItems = page.locator(".cardSpreadCard");
      const count = await cardSpreadItems.count();

      if (count > 0) {
        await cardSpreadItems.last().click({ force: true });
      }
    }

    // Score should have changed (at least one badge shows non-zero)
    const successText = await scoreBadges.first().textContent();
    const failsText = await scoreBadges.last().textContent();
    const totalScore =
      Number.parseInt(successText || "0", 10) +
      Number.parseInt(failsText || "0", 10);
    expect(totalScore).toBeGreaterThan(0);

    // User can access settings to change mode (settings button in main area)
    const settingsButton = page
      .getByRole("main")
      .locator("button")
      .filter({ has: page.locator("svg") });
    await settingsButton.click();
    await page.waitForTimeout(300);

    // Change to card-only mode
    await page.locator("text=Card only").first().click();
    await page.waitForTimeout(300);

    // Close modal
    await page.keyboard.press("Escape");
    await page.waitForLoadState("networkidle");

    // Mode should be saved (localStorage values are JSON-stringified)
    const mode = await page.evaluate(() => {
      const value = localStorage.getItem("memdeck-app-flashcard-option");
      return value ? JSON.parse(value) : null;
    });
    expect(mode).toBe("cardonly");
  });

  test("should allow user to switch decks mid-session", async ({ page }) => {
    // Start with one deck
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.locator("select").first().selectOption("mnemonica");
    await page.waitForLoadState("networkidle");

    // Go to flashcard
    await page.locator("a:has-text('Flashcard')").first().click();
    await page.waitForLoadState("networkidle");

    // Practice a bit (use force:true due to overlapping cards)
    const cardSpreadItems = page.locator(".cardSpreadCard");
    if ((await cardSpreadItems.count()) > 0) {
      await cardSpreadItems.last().click({ force: true });
    }

    // Navigate to home
    await page.locator("a:has-text('Home')").first().click();
    await page.waitForLoadState("networkidle");

    // Switch to different deck
    await page.locator("select").first().selectOption("redford");
    await page.waitForLoadState("networkidle");

    // Go back to flashcard with new deck
    await page.locator("a:has-text('Flashcard')").first().click();
    await page.waitForLoadState("networkidle");

    // Flashcard page should load with score badges
    const scoreBadges = page.locator(".mantine-Badge-root");
    await expect(scoreBadges).toHaveCount(2);
    await expect(
      page.getByRole("heading", { name: "Flashcard" })
    ).toBeVisible();
  });

  test("should allow user to explore all pages when stack is selected", async ({
    page,
  }) => {
    // Navigate to home and select stack
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.locator("select").first().selectOption("particle");
    await page.waitForLoadState("networkidle");

    // Should be able to navigate to all pages
    const pages = ["Flashcard", "Shuffle", "ACAAN", "Toolbox", "Resources"];

    for (const pageName of pages) {
      await page.locator(`a:has-text('${pageName}')`).first().click();
      await page.waitForLoadState("networkidle");

      // Each page should load
      await expect(page.locator("body")).toBeVisible();

      // Navigate back to home
      await page.locator("a:has-text('Home')").first().click();
      await page.waitForLoadState("networkidle");

      // Stack should still be selected
      const selectedValue = await page.locator("select").first().inputValue();
      expect(selectedValue).toBe("particle");
    }
  });

  test("should handle user toggling theme multiple times", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Use hidden input for checking state, visible track for clicking
    const themeSwitch = page.locator("input[type='checkbox']").first();
    const themeSwitchTrack = page.locator(".mantine-Switch-track").first();

    // Get initial state
    let isLight = await themeSwitch.isChecked();

    // Toggle multiple times by clicking the visible track
    for (let i = 0; i < 4; i++) {
      await themeSwitchTrack.click();
      await page.waitForTimeout(300);
      isLight = !isLight;

      // Verify state changed
      const currentState = await themeSwitch.isChecked();
      expect(currentState).toBe(isLight);
    }

    // Final state should be persisted (color scheme is stored as plain string)
    const scheme = await page.evaluate(() => {
      return localStorage.getItem("memdeck-app-color-scheme");
    });

    const expectedScheme = isLight ? "light" : "dark";
    expect(scheme).toBe(expectedScheme);
  });

  test("should work properly on smaller screens", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigate to home
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Title should still be visible
    await expect(page.locator("text=Welcome to MemDeck")).toBeVisible();

    // On mobile, stack picker may be in the nav - open burger menu first
    const burgerButton = page.locator(".mantine-Burger-root");
    if (await burgerButton.isVisible()) {
      await burgerButton.click();
      await page.waitForTimeout(300);
    }

    // Stack picker should be accessible
    const select = page.locator("select").first();
    await expect(select).toBeVisible();

    // Select a stack
    await select.selectOption("mnemonica");
    await page.waitForLoadState("networkidle");

    // Navigate to flashcard - may need to click burger menu again on mobile
    if (await burgerButton.isVisible()) {
      // Check if nav is still open, if not reopen it
      const flashcardLink = page.locator("a:has-text('Flashcard')").first();
      if (!(await flashcardLink.isVisible())) {
        await burgerButton.click();
        await page.waitForTimeout(300);
      }
    }

    await page.locator("a:has-text('Flashcard')").first().click();
    await page.waitForLoadState("networkidle");

    // Flashcard should be usable on mobile
    await expect(
      page.getByRole("heading", { name: "Flashcard" })
    ).toBeVisible();

    // Card spread items should be visible
    const cardSpreadItems = page.locator(".cardSpreadCard");
    const itemCount = await cardSpreadItems.count();
    expect(itemCount).toBeGreaterThan(0);

    // Score badges should be visible
    const scoreBadges = page.locator(".mantine-Badge-root");
    await expect(scoreBadges).toHaveCount(2);
  });

  test("should handle user returning after period of inactivity", async ({
    page,
  }) => {
    // User sets up preferences
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.locator("select").first().selectOption("memorandum");
    await page.waitForLoadState("networkidle");

    // Navigate to flashcard and set mode
    await page.locator("a:has-text('Flashcard')").first().click();
    await page.waitForLoadState("networkidle");

    // Settings button is in main content area (not header)
    const settingsButton = page
      .getByRole("main")
      .locator("button")
      .filter({ has: page.locator("svg") });
    await settingsButton.click();
    await page.waitForTimeout(300);

    await page.locator("text=Number only").first().click();
    await page.waitForTimeout(300);
    await page.keyboard.press("Escape");

    // Simulate inactivity by reloading
    await page.reload();
    await page.waitForLoadState("networkidle");

    // All preferences should be restored
    const selectedValue = await page.locator("select").first().inputValue();
    expect(selectedValue).toBe("memorandum");

    // localStorage values are JSON-stringified
    const mode = await page.evaluate(() => {
      const value = localStorage.getItem("memdeck-app-flashcard-option");
      return value ? JSON.parse(value) : null;
    });
    expect(mode).toBe("numberonly");
  });
});
