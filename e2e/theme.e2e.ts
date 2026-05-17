import { expect } from "@playwright/test";
import { COLOR_SCHEME_LSK } from "../src/constants";
import { test } from "./fixtures/test-setup";

declare global {
  interface Window {
    __failColorSchemeWrites?: boolean;
  }
}

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
    await expect(themeSwitch).toBeChecked({ checked: !initialChecked });

    // Verify theme changed
    const newChecked = await themeSwitch.isChecked();
    expect(newChecked).not.toBe(initialChecked);
  });

  test("should persist theme selection in localStorage", async ({ page }) => {
    const themeSwitch = page.locator("input[type='checkbox']").first();
    const themeSwitchTrack = page.locator(".mantine-Switch-track").first();

    // Toggle to dark theme by clicking the visible track
    await themeSwitchTrack.click();
    await expect(themeSwitch).not.toBeChecked();

    // Check localStorage
    const colorScheme = await page.evaluate(
      (key) => localStorage.getItem(key),
      COLOR_SCHEME_LSK
    );

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
      await expect(themeSwitch).not.toBeChecked();
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
    const initialBg = await body.evaluate(
      (el) => window.getComputedStyle(el).backgroundColor
    );

    // Toggle theme by clicking the visible track
    await themeSwitchTrack.click();

    // Wait for background color to change (CSS transition)
    await expect(async () => {
      const newBg = await body.evaluate(
        (el) => window.getComputedStyle(el).backgroundColor
      );
      expect(newBg).not.toBe(initialBg);
    }).toPass();
  });

  test("should maintain theme across page navigation", async ({ page }) => {
    const themeSwitch = page.locator("input[type='checkbox']").first();
    const themeSwitchTrack = page.locator(".mantine-Switch-track").first();

    // Set to dark theme
    const initialChecked = await themeSwitch.isChecked();
    if (initialChecked) {
      await themeSwitchTrack.click();
      await expect(themeSwitch).not.toBeChecked();
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
    await page
      .locator("[data-testid='stack-picker']")
      .first()
      .selectOption("mnemonica");
    await page.waitForLoadState("networkidle");

    // Navigate to flashcard
    await page.locator("a:has-text('Flashcard')").first().click();
    await page.waitForLoadState("networkidle");

    // Toggle theme
    const themeSwitch = page.locator("input[type='checkbox']").first();
    const themeSwitchTrack = page.locator(".mantine-Switch-track").first();
    const initialChecked = await themeSwitch.isChecked();

    await themeSwitchTrack.click();
    await expect(themeSwitch).toBeChecked({ checked: !initialChecked });

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
      await expect(themeSwitch).toBeChecked();
    }

    // Check main text is visible
    await expect(
      page.getByRole("heading", { name: "Master your memorized deck" })
    ).toBeVisible();

    // Toggle to dark theme
    await themeSwitchTrack.click();
    await expect(themeSwitch).not.toBeChecked();

    // Text should still be visible
    await expect(
      page.getByRole("heading", { name: "Master your memorized deck" })
    ).toBeVisible();
  });
});

// Top-level describe (sibling, not nested) so the parent's `goto("/")`
// beforeEach doesn't fire — the `setItem` shim must be installed via
// `addInitScript` before any app code runs.
test.describe("Theme & Color Scheme — write failure", () => {
  test("should surface the localDbWriteFailed toast when the color-scheme write throws", async ({
    page,
  }) => {
    await page.addInitScript((key) => {
      // Pre-seed with the default value so the post-test assertion proves
      // the failed write did NOT overwrite localStorage — without this,
      // `getItem` would return null whether the shim threw or the write
      // never happened at all.
      window.localStorage.setItem(key, "light");
      const originalSetItem = window.localStorage.setItem.bind(
        window.localStorage
      );
      window.localStorage.setItem = function patchedSetItem(
        k: string,
        v: string
      ) {
        if (k === key && window.__failColorSchemeWrites === true) {
          throw new DOMException("Quota exceeded", "QuotaExceededError");
        }
        originalSetItem(k, v);
      };
    }, COLOR_SCHEME_LSK);

    await page.goto("/");
    // Waiting on the switch to render proves React has committed, not just
    // that the network is idle — `networkidle` would resolve before Mantine
    // mounts and could let the shim arm during the render window.
    const themeSwitchTrack = page.locator(".mantine-Switch-track").first();
    await expect(themeSwitchTrack).toBeVisible();

    // Arm the shim after mount so any mount-time Mantine writes can't trip
    // the toast before the user-triggered toggle — keeps the assertion
    // attributable to the click below.
    await page.evaluate(() => {
      window.__failColorSchemeWrites = true;
    });

    await themeSwitchTrack.click();

    // Match the message body, which is unique to `errors.localDbWriteFailed`
    // — using the title ("Couldn't save") as substring would also match the
    // unrelated `errors.sessionSaveFailed` toast whose message starts with
    // "Couldn't save your session…".
    const notification = page
      .getByRole("alert")
      .filter({ hasText: "recent changes won't persist" });
    await expect(notification).toBeVisible({ timeout: 2000 });

    const stored = await page.evaluate(
      (key) => window.localStorage.getItem(key),
      COLOR_SCHEME_LSK
    );
    expect(stored).toBe("light");
  });
});
