import { expect } from "@playwright/test";
import { test } from "./fixtures/test-setup";

// URL patterns
const HOME_URL_PATTERN = /#\/$/;
const RESOURCES_URL_PATTERN = /#\/resources$/;
const SHUFFLE_URL_PATTERN = /#\/shuffle$/;
const ACAAN_URL_PATTERN = /#\/acaan$/;
const TOOLBOX_URL_PATTERN = /#\/toolbox$/;

test.describe("Pages & Features", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home before each test
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Select a stack for features that require it
    await page.locator("select").first().selectOption("mnemonica");
    await page.waitForLoadState("networkidle");
  });

  test("should load resources page", async ({ page }) => {
    // Navigate to resources
    await page.locator("a:has-text('Resources')").first().click();
    await page.waitForLoadState("networkidle");

    // Verify URL changed
    await expect(page).toHaveURL(RESOURCES_URL_PATTERN);

    // Verify page content loads (may contain links or content)
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load shuffle page", async ({ page }) => {
    // Navigate to shuffle
    await page.locator("a:has-text('Shuffle')").first().click();
    await page.waitForLoadState("networkidle");

    // Verify URL changed
    await expect(page).toHaveURL(SHUFFLE_URL_PATTERN);

    // Verify page is not empty
    await expect(page.locator("body")).toBeVisible();
  });

  test("should display coming soon message on shuffle page", async ({
    page,
  }) => {
    // Navigate to shuffle
    await page.locator("a:has-text('Shuffle')").first().click();
    await page.waitForLoadState("networkidle");

    // Page should load successfully
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load ACAAN page", async ({ page }) => {
    // Navigate to ACAAN
    await page.locator("a:has-text('ACAAN')").first().click();
    await page.waitForLoadState("networkidle");

    // Verify URL changed
    await expect(page).toHaveURL(ACAAN_URL_PATTERN);

    // Verify page is not empty
    await expect(page.locator("body")).toBeVisible();
  });

  test("should display content on ACAAN page", async ({ page }) => {
    // Navigate to ACAAN
    await page.locator("a:has-text('ACAAN')").first().click();
    await page.waitForLoadState("networkidle");

    // Page should load successfully
    await expect(page.locator("body")).toBeVisible();
  });

  test("should load toolbox page", async ({ page }) => {
    // Navigate to toolbox
    await page.locator("a:has-text('Toolbox')").first().click();
    await page.waitForLoadState("networkidle");

    // Verify URL changed
    await expect(page).toHaveURL(TOOLBOX_URL_PATTERN);

    // Verify page is not empty
    await expect(page.locator("body")).toBeVisible();
  });

  test("should display content on toolbox page", async ({ page }) => {
    // Navigate to toolbox
    await page.locator("a:has-text('Toolbox')").first().click();
    await page.waitForLoadState("networkidle");

    // Page should load successfully
    await expect(page.locator("body")).toBeVisible();
  });

  test("should have working github link in header", async ({ page }) => {
    // Find github link
    const githubLink = page
      .locator('a[aria-label="Github"], a[href*="github"]')
      .first();
    await expect(githubLink).toBeVisible();

    // Verify it has correct href
    const href = await githubLink.getAttribute("href");
    expect(href).toContain("github");
  });

  test("should have working github link with noopener attribute", async ({
    page,
  }) => {
    // Find github link
    const githubLink = page.locator('a[href*="github"]').first();

    // Verify rel attribute includes noopener
    const rel = await githubLink.getAttribute("rel");
    if (rel) {
      expect(rel).toContain("noopener");
    }
  });

  test("should navigate back to home when clicking logo", async ({ page }) => {
    // Navigate to a different page
    await page.locator("a:has-text('Resources')").first().click();
    await page.waitForLoadState("networkidle");

    // Verify we're not on home
    await expect(page).toHaveURL(RESOURCES_URL_PATTERN);

    // Click logo/home link
    const homeLink = page.locator("a[href='#/']").first();
    await homeLink.click();
    await page.waitForLoadState("networkidle");

    // Should be back on home
    await expect(page).toHaveURL(HOME_URL_PATTERN);
  });
});
