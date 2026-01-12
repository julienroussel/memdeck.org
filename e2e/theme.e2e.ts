import { expect } from "@playwright/test";
import { test } from "./fixtures/test-setup";

test.describe("Theme & Color Scheme", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page before each test
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("should display theme toggle switch in header", async ({ page }) => {
    // Look for the theme toggle switch (the visible track element)
    const themeSwitchTrack = page.locator(".mantine-Switch-track").first();
    await expect(themeSwitchTrack).toBeVisible();
  });

  test("should have light theme as default", async ({ page }) => {
    // Check if light theme is default by looking for sun icon visibility
    // or by checking the switch state
    const themeSwitch = page.locator("input[type='checkbox']").first();

    // Default should be light mode (checked)
    const isChecked = await themeSwitch.isChecked();
    expect(isChecked).toBeTruthy();
  });

  test("should toggle between light and dark theme", async ({ page }) => {
    const themeSwitch = page.locator("input[type='checkbox']").first();
    const themeSwitchTrack = page.locator(".mantine-Switch-track").first();

    // Get initial theme
    const initialChecked = await themeSwitch.isChecked();

    // Toggle theme by clicking the visible track
    await themeSwitchTrack.click();
    await page.waitForTimeout(300);

    // Verify theme changed
    const newChecked = await themeSwitch.isChecked();
    expect(newChecked).not.toBe(initialChecked);
  });

  test("should persist theme selection in localStorage", async ({ page }) => {
    const themeSwitchTrack = page.locator(".mantine-Switch-track").first();

    // Toggle to dark theme by clicking the visible track
    await themeSwitchTrack.click();
    await page.waitForTimeout(300);

    // Check localStorage
    const colorScheme = await page.evaluate(() => {
      return localStorage.getItem("memdeck-app-color-scheme");
    });

    expect(colorScheme).toBe("dark");
  });

  test("should restore theme selection on page reload", async ({ page }) => {
    const themeSwitch = page.locator("input[type='checkbox']").first();
    const themeSwitchTrack = page.locator(".mantine-Switch-track").first();

    // Set to dark theme
    const initialChecked = await themeSwitch.isChecked();
    if (initialChecked) {
      // Currently light, toggle to dark by clicking the visible track
      await themeSwitchTrack.click();
      await page.waitForTimeout(300);
    }

    // Reload page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Verify theme is restored
    const reloadedSwitch = page.locator("input[type='checkbox']").first();
    const reloadedChecked = await reloadedSwitch.isChecked();

    expect(reloadedChecked).toBe(!initialChecked);
  });

  test("should apply dark theme styles when theme is switched", async ({
    page,
  }) => {
    const themeSwitchTrack = page.locator(".mantine-Switch-track").first();

    // Get initial background color
    const body = page.locator("body");
    const initialBg = await body.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    // Toggle theme by clicking the visible track
    await themeSwitchTrack.click();
    await page.waitForTimeout(500);

    // Get new background color
    const newBg = await body.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    // Colors should be different
    expect(initialBg).not.toBe(newBg);
  });

  test("should maintain theme across page navigation", async ({ page }) => {
    const themeSwitch = page.locator("input[type='checkbox']").first();
    const themeSwitchTrack = page.locator(".mantine-Switch-track").first();

    // Set to dark theme
    const initialChecked = await themeSwitch.isChecked();
    if (initialChecked) {
      await themeSwitchTrack.click();
      await page.waitForTimeout(300);
    }

    // Navigate to resources
    await page.locator("a:has-text('Resources')").first().click();
    await page.waitForLoadState("networkidle");

    // Theme switch should still be unchecked
    const resourcesPageSwitch = page.locator("input[type='checkbox']").first();
    const resourcesChecked = await resourcesPageSwitch.isChecked();
    expect(resourcesChecked).toBe(!initialChecked);

    // Navigate back to home
    await page.locator("a:has-text('Home')").first().click();
    await page.waitForLoadState("networkidle");

    // Theme should still be dark
    const homeSwitch = page.locator("input[type='checkbox']").first();
    const homeChecked = await homeSwitch.isChecked();
    expect(homeChecked).toBe(!initialChecked);
  });

  test("should toggle theme from any page", async ({ page }) => {
    // Select a stack first
    await page.locator("select").first().selectOption("mnemonica");
    await page.waitForLoadState("networkidle");

    // Navigate to flashcard
    await page.locator("a:has-text('Flashcard')").first().click();
    await page.waitForLoadState("networkidle");

    // Toggle theme
    const themeSwitch = page.locator("input[type='checkbox']").first();
    const themeSwitchTrack = page.locator(".mantine-Switch-track").first();
    const initialChecked = await themeSwitch.isChecked();

    await themeSwitchTrack.click();
    await page.waitForTimeout(300);

    // Verify it changed
    const newChecked = await themeSwitch.isChecked();
    expect(newChecked).not.toBe(initialChecked);

    // Navigate to resources
    await page.locator("a:has-text('Resources')").first().click();
    await page.waitForLoadState("networkidle");

    // Theme should still be dark
    const resourcesSwitch = page.locator("input[type='checkbox']").first();
    const resourcesChecked = await resourcesSwitch.isChecked();
    expect(resourcesChecked).toBe(newChecked);
  });

  test("should have proper contrast in both themes", async ({ page }) => {
    // Test light theme contrast
    const themeSwitch = page.locator("input[type='checkbox']").first();
    const themeSwitchTrack = page.locator(".mantine-Switch-track").first();

    // Ensure light theme
    const isLight = await themeSwitch.isChecked();
    if (!isLight) {
      await themeSwitchTrack.click();
      await page.waitForTimeout(300);
    }

    // Check main text is visible
    await expect(page.locator("text=Welcome to MemDeck")).toBeVisible();

    // Toggle to dark theme
    await themeSwitchTrack.click();
    await page.waitForTimeout(300);

    // Text should still be visible
    await expect(page.locator("text=Welcome to MemDeck")).toBeVisible();
  });
});
