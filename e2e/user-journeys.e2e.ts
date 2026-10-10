import { expect } from "@playwright/test";
import { COLOR_SCHEME_LSK } from "../src/constants";
import {
  CORRECT_ANSWERS_PATTERN,
  INCORRECT_ANSWERS_PATTERN,
} from "./fixtures/patterns";
import { readCount } from "./fixtures/read-count";
import { test } from "./fixtures/test-setup";

// URL patterns
const FLASHCARD_URL_PATTERN = /\/flashcard\/?$/;

test.describe("User Journeys", () => {
  test("should complete first-time user onboarding flow", async ({ page }) => {
    // Load home page - user sees welcome message
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: "Master your memorized deck" })
    ).toBeVisible();
    // New users see the intro text and stack picker
    await expect(
      page.getByText("Pick a stack below to get started", { exact: false })
    ).toBeVisible();

    // User selects a stack
    await page
      .locator("[data-testid='stack-picker']")
      .first()
      .selectOption("mnemonica");

    // Verify stack selection persists
    await expect(
      page.locator("[data-testid='stack-picker']").first()
    ).toHaveValue("mnemonica");

    // Stack name should be displayed (mnemonica's display name is "Tamariz")
    await expect(page.getByRole("main").getByText("Tamariz")).toBeVisible();

    // User can now navigate to flashcard
    await page.locator("#main-nav a:has-text('Flashcard')").click();

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
    await page
      .locator("[data-testid='stack-picker']")
      .first()
      .selectOption("aronson");

    // Go to flashcard
    await page.locator("#main-nav a:has-text('Flashcard')").click();

    // Verify training page loaded
    await expect(
      page.getByRole("heading", { name: "Flashcard" })
    ).toBeVisible();
    // Score is shown as badges, verify they exist
    const scoreBadges = page.locator("main .mantine-Badge-root");
    await expect(scoreBadges).toHaveCount(2);

    // User practices by clicking answers
    for (let i = 0; i < 5; i += 1) {
      // Wait for card spread to render before clicking
      await expect(page.locator(".cardSpreadCard").first()).toBeVisible();

      // Click a choice from the card spread (use force:true due to overlapping)
      await page.locator(".cardSpreadCard").last().click({ force: true });
    }

    // Score should have changed
    await expect
      .poll(
        async () =>
          (await readCount(page.getByText(CORRECT_ANSWERS_PATTERN))) +
          (await readCount(page.getByText(INCORRECT_ANSWERS_PATTERN)))
      )
      .toBeGreaterThan(0);

    // User can change mode via settings popover
    await page.getByRole("button", { name: "Flashcard settings" }).click();
    const secondarySelector = page.getByRole("radiogroup", {
      name: "Position mode variant",
    });
    await secondarySelector.getByText("Card").click();
    await page.getByRole("button", { name: "Flashcard settings" }).click();

    // Mode should be saved (localStorage values are JSON-stringified)
    const mode = await page.evaluate((): unknown => {
      const value = localStorage.getItem("memdeck-app-flashcard-option");
      return value ? JSON.parse(value) : null;
    });
    expect(mode).toBe("cardonly");
  });

  test("should allow user to switch decks mid-session", async ({ page }) => {
    // Start with one deck
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page
      .locator("[data-testid='stack-picker']")
      .first()
      .selectOption("mnemonica");

    // Go to flashcard
    await page.locator("#main-nav a:has-text('Flashcard')").click();

    // Practice a bit (use force:true due to overlapping cards)
    const cardSpreadItems = page.locator(".cardSpreadCard");
    await expect(cardSpreadItems.first()).toBeVisible();
    await cardSpreadItems.last().click({ force: true });

    // Navigate to home
    await page.locator("#main-nav a:has-text('Home')").click();
    await expect(
      page.getByRole("heading", { name: "Ready to train?" })
    ).toBeVisible();

    // Switch to different deck
    await page
      .locator("[data-testid='stack-picker']")
      .first()
      .selectOption("redford");

    // Go back to flashcard with new deck
    await page.locator("#main-nav a:has-text('Flashcard')").click();

    // Flashcard page should load with score badges
    const scoreBadges = page.locator("main .mantine-Badge-root");
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

    await page
      .locator("[data-testid='stack-picker']")
      .first()
      .selectOption("particle");

    // Should be able to navigate to all pages
    const pages = [
      { heading: "Flashcard", link: "Flashcard" },
      { heading: "ACAAN", link: "ACAAN" },
      { heading: "Toolbox", link: "Toolbox" },
      { heading: "Memorized Deck Resources", link: "Resources" },
    ];

    for (const { heading, link } of pages) {
      await page.locator(`#main-nav a:has-text('${link}')`).click();

      // Each page should load
      await expect(
        page.getByRole("heading", { level: 1, name: heading })
      ).toBeVisible();

      // Navigate back to home
      await page.locator("#main-nav a:has-text('Home')").click();
      await expect(
        page.getByRole("heading", { name: "Ready to train?" })
      ).toBeVisible();

      // Stack should still be selected
      await expect(
        page.locator("[data-testid='stack-picker']").first()
      ).toHaveValue("particle");
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
    for (let i = 0; i < 4; i += 1) {
      await themeSwitchTrack.click();
      isLight = !isLight;

      // Wait for switch state to update before checking
      await expect(themeSwitch).toBeChecked({ checked: isLight });

      // Verify state changed
      const currentState = await themeSwitch.isChecked();
      expect(currentState).toBe(isLight);
    }

    // Final state should be persisted (color scheme is stored as plain string)
    const scheme = await page.evaluate(
      (key) => localStorage.getItem(key),
      COLOR_SCHEME_LSK
    );

    const expectedScheme = isLight ? "light" : "dark";
    expect(scheme).toBe(expectedScheme);
  });

  test("should work properly on smaller screens", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ height: 667, width: 375 });

    // Navigate to home
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Title should still be visible
    await expect(
      page.getByRole("heading", { name: "Master your memorized deck" })
    ).toBeVisible();

    // On mobile, stack picker may be in the nav - open burger menu first
    const burgerButton = page.locator(".mantine-Burger-root");
    if (await burgerButton.isVisible()) {
      await burgerButton.click();
      // Wait for menu to open
      await expect(
        page.locator("[data-testid='stack-picker']").first()
      ).toBeVisible();
    }

    // Stack picker should be accessible
    const select = page.locator("[data-testid='stack-picker']").first();
    await expect(select).toBeVisible();

    // Select a stack
    await select.selectOption("mnemonica");

    // Navigate to flashcard - may need to click burger menu again on mobile
    if (await burgerButton.isVisible()) {
      // Check if nav is still open, if not reopen it
      const flashcardLink = page.locator("#main-nav a:has-text('Flashcard')");
      if (!(await flashcardLink.isVisible())) {
        await burgerButton.click();
        await expect(flashcardLink).toBeVisible();
      }
    }

    await page.locator("#main-nav a:has-text('Flashcard')").click();

    // Flashcard should be usable on mobile
    await expect(
      page.getByRole("heading", { name: "Flashcard" })
    ).toBeVisible();

    // Card spread items should be visible
    await expect(page.locator(".cardSpreadCard")).not.toHaveCount(0);

    // Score badges should be visible
    const scoreBadges = page.locator("main .mantine-Badge-root");
    await expect(scoreBadges).toHaveCount(2);
  });

  test("should handle user returning after period of inactivity", async ({
    page,
  }) => {
    // User sets up preferences
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page
      .locator("[data-testid='stack-picker']")
      .first()
      .selectOption("memorandum");

    // Navigate to flashcard and set mode
    await page.locator("#main-nav a:has-text('Flashcard')").click();

    // Open settings popover and select number-only mode
    await page.getByRole("button", { name: "Flashcard settings" }).click();
    const secondarySelector = page.getByRole("radiogroup", {
      name: "Position mode variant",
    });
    await secondarySelector.getByText("Number").click();
    await page.getByRole("button", { name: "Flashcard settings" }).click();

    // Simulate inactivity by reloading
    await page.reload();
    await page.waitForLoadState("networkidle");

    // All preferences should be restored
    await expect(
      page.locator("[data-testid='stack-picker']").first()
    ).toHaveValue("memorandum");

    // localStorage values are JSON-stringified
    const mode = await page.evaluate((): unknown => {
      const value = localStorage.getItem("memdeck-app-flashcard-option");
      return value ? JSON.parse(value) : null;
    });
    expect(mode).toBe("numberonly");
  });
});
