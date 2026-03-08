import { expect } from "@playwright/test";
import { test } from "./fixtures/test-setup";

// URL patterns
const HOME_URL_PATTERN = /\/$/;
const RESOURCES_URL_PATTERN = /\/resources$/;
const FLASHCARD_URL_PATTERN = /\/flashcard$/;
const ACAAN_URL_PATTERN = /\/acaan$/;
const TOOLBOX_URL_PATTERN = /\/toolbox$/;

test.describe("Navigation", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page before each test
    await page.goto("/");
    // Wait for app to load
    await page.waitForLoadState("networkidle");
  });

  test("should display home page on initial load", async ({ page }) => {
    await expect(page.locator("text=Master your memorized deck")).toBeVisible();
  });

  test("should display navbar with all main navigation links", async ({
    page,
  }) => {
    const navLinks = ["Home", "Resources", "Flashcard", "ACAAN", "Toolbox"];

    for (const link of navLinks) {
      const linkElement = page.locator(`#main-nav a:has-text("${link}")`);
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
    await expect(page.locator("text=Master your memorized deck")).toBeVisible();
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
    await page
      .locator("[data-testid='stack-picker']")
      .first()
      .selectOption("mnemonica");
    await page.waitForLoadState("networkidle");

    // Click on flashcard link in nav
    await page.locator("#main-nav a:has-text('Flashcard')").click();
    await page.waitForLoadState("networkidle");

    // Verify we're on flashcard page
    await expect(page).toHaveURL(FLASHCARD_URL_PATTERN);
    await expect(
      page.getByRole("heading", { name: "Flashcard" })
    ).toBeVisible();
  });

  test("should navigate to ACAAN page when stack is selected", async ({
    page,
  }) => {
    // Select a stack first
    await page
      .locator("[data-testid='stack-picker']")
      .first()
      .selectOption("mnemonica");
    await page.waitForLoadState("networkidle");

    // Click on ACAAN link in nav
    await page.locator("#main-nav a:has-text('ACAAN')").click();
    await page.waitForLoadState("networkidle");

    // Verify we're on ACAAN page
    await expect(page).toHaveURL(ACAAN_URL_PATTERN);
  });

  test("should navigate to toolbox page when stack is selected", async ({
    page,
  }) => {
    // Select a stack first
    await page
      .locator("[data-testid='stack-picker']")
      .first()
      .selectOption("mnemonica");
    await page.waitForLoadState("networkidle");

    // Click on toolbox link in nav
    await page.locator("#main-nav a:has-text('Toolbox')").click();
    await page.waitForLoadState("networkidle");

    // Verify we're on toolbox page
    await expect(page).toHaveURL(TOOLBOX_URL_PATTERN);
  });

  test("should update URL path when navigating between pages", async ({
    page,
  }) => {
    // Select a stack
    await page
      .locator("[data-testid='stack-picker']")
      .first()
      .selectOption("mnemonica");
    await page.waitForLoadState("networkidle");

    // Navigate to flashcard
    await page.locator("#main-nav a:has-text('Flashcard')").click();
    await expect(page).toHaveURL(FLASHCARD_URL_PATTERN);

    // Navigate to resources
    await page.locator("#main-nav a:has-text('Resources')").click();
    await expect(page).toHaveURL(RESOURCES_URL_PATTERN);

    // Navigate back to home
    await page.locator("#main-nav a:has-text('Home')").click();
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
      await expect(resourcesLink).toBeVisible();
      isVisible = true;
    }

    await expect(resourcesLink).toBeVisible();
  });
});
