import { expect } from "@playwright/test";
import { test } from "./fixtures/test-setup";

const TOOLBOX_URL_PATTERN = /\/toolbox$/;
const HOME_URL_PATTERN = /\/$/;
const SEARCH_INPUT_PATTERN = /search/i;

test.describe("Toolbox Page", () => {
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

    // Navigate to toolbox page
    await page.locator("a:has-text('Toolbox')").first().click();
    await page.waitForLoadState("networkidle");
  });

  test("should load toolbox page and render correctly after selecting a stack", async ({
    page,
  }) => {
    // Verify URL is correct
    await expect(page).toHaveURL(TOOLBOX_URL_PATTERN);

    // Verify page title is visible
    await expect(
      page.getByRole("heading", { name: "Toolbox", level: 1 })
    ).toBeVisible();

    // Verify Stack Lookup section is present in the accordion
    await expect(page.locator("text=Stack Lookup")).toBeVisible();
  });

  test("should require a stack to be selected (RequireStack guard)", async ({
    page,
  }) => {
    // Clear localStorage to remove stack selection
    await page.evaluate(() => {
      localStorage.removeItem("memdeck-app-stack");
    });

    // Try to navigate directly to toolbox
    await page.goto("/toolbox");
    await page.waitForLoadState("networkidle");

    // Should be redirected to home page
    await expect(page).toHaveURL(HOME_URL_PATTERN);

    // Should show home page content
    await expect(page.locator("text=Welcome to MemDeck")).toBeVisible();
  });

  test("should render toolbox page for all available stack options", async ({
    page,
  }) => {
    // Test with each stack type
    const stacks = [
      "mnemonica",
      "aronson",
      "memorandum",
      "redford",
      "particle",
    ];

    for (const stack of stacks) {
      // Navigate home
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // Select the stack
      await page
        .locator("[data-testid='stack-picker']")
        .first()
        .selectOption(stack);
      await page.waitForLoadState("networkidle");

      // Navigate to toolbox
      await page.locator("a:has-text('Toolbox')").first().click();
      await page.waitForLoadState("networkidle");

      // Should render correctly
      await expect(page).toHaveURL(TOOLBOX_URL_PATTERN);
      await expect(
        page.getByRole("heading", { name: "Toolbox", level: 1 })
      ).toBeVisible();

      // Verify stack persisted
      const stackKey = await page.evaluate(() => {
        const value = localStorage.getItem("memdeck-app-stack");
        return value ? JSON.parse(value) : null;
      });
      expect(stackKey).toBe(stack);
    }
  });

  test("should persist toolbox page access with selected stack in localStorage", async ({
    page,
  }) => {
    // Verify we're on toolbox page
    await expect(page).toHaveURL(TOOLBOX_URL_PATTERN);

    // Check localStorage has stack selection
    const stackKey = await page.evaluate(() => {
      const value = localStorage.getItem("memdeck-app-stack");
      return value ? JSON.parse(value) : null;
    });

    expect(stackKey).toBe("mnemonica");

    // Reload the page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Should still be on toolbox (not redirected)
    await expect(page).toHaveURL(TOOLBOX_URL_PATTERN);
    await expect(
      page.getByRole("heading", { name: "Toolbox", level: 1 })
    ).toBeVisible();
  });

  test("should filter stack lookup results when searching", async ({
    page,
  }) => {
    // Navigate to toolbox (stack should already be selected from beforeEach)
    await page.goto("/toolbox");

    // Open the Stack Lookup accordion
    await page.locator("text=Stack Lookup").click();

    // Verify all 52 cards are shown
    await expect(page.locator("table tbody tr")).toHaveCount(52);

    // Search for aces
    await page.getByRole("textbox", { name: SEARCH_INPUT_PATTERN }).fill("ace");
    await expect(page.locator("table tbody tr")).toHaveCount(4);

    // Search for non-existent card
    await page.getByRole("textbox", { name: SEARCH_INPUT_PATTERN }).fill("zzz");
    await expect(
      page.getByRole("paragraph").filter({ hasText: "No matching cards" })
    ).toBeVisible();
  });

  test("should handle browser back/forward navigation correctly", async ({
    page,
  }) => {
    // We're on toolbox from beforeEach
    await expect(page).toHaveURL(TOOLBOX_URL_PATTERN);

    // Navigate to home
    await page.locator("a:has-text('Home')").first().click();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(HOME_URL_PATTERN);

    // Use browser back button
    await page.goBack();
    await page.waitForLoadState("networkidle");

    // Should be back on toolbox
    await expect(page).toHaveURL(TOOLBOX_URL_PATTERN);
    await expect(
      page.getByRole("heading", { name: "Toolbox", level: 1 })
    ).toBeVisible();

    // Use browser forward button
    await page.goForward();
    await page.waitForLoadState("networkidle");

    // Should be back on home
    await expect(page).toHaveURL(HOME_URL_PATTERN);
  });
});
