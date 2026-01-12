import { expect } from "@playwright/test";
import { test } from "./fixtures/test-setup";

// URL patterns
const HOME_URL_PATTERN = /#\/$/;
const RESOURCES_URL_PATTERN = /#\/resources$/;
const FLASHCARD_URL_PATTERN = /#\/flashcard$/;
const SHUFFLE_URL_PATTERN = /#\/shuffle$/;
const ACAAN_URL_PATTERN = /#\/acaan$/;
const TOOLBOX_URL_PATTERN = /#\/toolbox$/;

test.describe("Navigation", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page before each test
    await page.goto("/");
    // Wait for app to load
    await page.waitForLoadState("networkidle");
  });

  test("should display home page on initial load", async ({ page }) => {
    await expect(page.locator("text=Welcome to MemDeck")).toBeVisible();
  });

  test("should display navbar with all main navigation links", async ({
    page,
  }) => {
    const navLinks = [
      "Home",
      "Resources",
      "Flashcard",
      "Shuffle",
      "ACAAN",
      "Toolbox",
    ];

    for (const link of navLinks) {
      const linkElement = page.locator(`a:has-text("${link}")`);
      await expect(linkElement).toBeVisible();
    }
  });

  test("should navigate to home page when clicking home link", async ({
    page,
  }) => {
    // Click on home link
    await page.locator("a:has-text('Home')").first().click();
    await page.waitForLoadState("networkidle");

    // Verify we're on home page
    await expect(page).toHaveURL(HOME_URL_PATTERN);
    await expect(page.locator("text=Welcome to MemDeck")).toBeVisible();
  });

  test("should navigate to resources page", async ({ page }) => {
    // Click on resources link
    await page.locator("a:has-text('Resources')").first().click();
    await page.waitForLoadState("networkidle");

    // Verify we're on resources page
    await expect(page).toHaveURL(RESOURCES_URL_PATTERN);
  });

  test("should navigate to flashcard page when stack is selected", async ({
    page,
  }) => {
    // Select a stack first
    await page.locator("select").first().selectOption("mnemonica");
    await page.waitForLoadState("networkidle");

    // Click on flashcard link
    await page.locator("a:has-text('Flashcard')").first().click();
    await page.waitForLoadState("networkidle");

    // Verify we're on flashcard page
    await expect(page).toHaveURL(FLASHCARD_URL_PATTERN);
    await expect(page.locator("text=Flashcard")).toBeVisible();
  });

  test("should navigate to shuffle page when stack is selected", async ({
    page,
  }) => {
    // Select a stack first
    await page.locator("select").first().selectOption("mnemonica");
    await page.waitForLoadState("networkidle");

    // Click on shuffle link
    await page.locator("a:has-text('Shuffle')").first().click();
    await page.waitForLoadState("networkidle");

    // Verify we're on shuffle page
    await expect(page).toHaveURL(SHUFFLE_URL_PATTERN);
  });

  test("should navigate to ACAAN page when stack is selected", async ({
    page,
  }) => {
    // Select a stack first
    await page.locator("select").first().selectOption("mnemonica");
    await page.waitForLoadState("networkidle");

    // Click on ACAAN link
    await page.locator("a:has-text('ACAAN')").first().click();
    await page.waitForLoadState("networkidle");

    // Verify we're on ACAAN page
    await expect(page).toHaveURL(ACAAN_URL_PATTERN);
  });

  test("should navigate to toolbox page when stack is selected", async ({
    page,
  }) => {
    // Select a stack first
    await page.locator("select").first().selectOption("mnemonica");
    await page.waitForLoadState("networkidle");

    // Click on toolbox link
    await page.locator("a:has-text('Toolbox')").first().click();
    await page.waitForLoadState("networkidle");

    // Verify we're on toolbox page
    await expect(page).toHaveURL(TOOLBOX_URL_PATTERN);
  });

  test("should update URL hash when navigating between pages", async ({
    page,
  }) => {
    // Select a stack
    await page.locator("select").first().selectOption("mnemonica");
    await page.waitForLoadState("networkidle");

    // Navigate to flashcard
    await page.locator("a:has-text('Flashcard')").first().click();
    await expect(page).toHaveURL(FLASHCARD_URL_PATTERN);

    // Navigate to resources
    await page.locator("a:has-text('Resources')").first().click();
    await expect(page).toHaveURL(RESOURCES_URL_PATTERN);

    // Navigate back to home
    await page.locator("a:has-text('Home')").first().click();
    await expect(page).toHaveURL(HOME_URL_PATTERN);
  });

  test("should open menu on mobile view when burger is clicked", async ({
    page,
  }) => {
    // Resize to mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForLoadState("networkidle");

    // Find burger button (may be hidden on desktop)
    const burgerButton = page.locator("button").filter({ hasText: "" }).first();

    // Menu should not be visible initially on mobile
    const resourcesLink = page.locator("a:has-text('Resources')");
    let isVisible = await resourcesLink.isVisible().catch(() => false);

    // If menu was hidden, click burger
    if (!isVisible) {
      await burgerButton.click();
      await page.waitForTimeout(300); // Wait for menu animation
      isVisible = await resourcesLink.isVisible().catch(() => false);
    }

    await expect(resourcesLink).toBeVisible();
  });
});
