import { expect } from "@playwright/test";
import { test } from "./fixtures/test-setup";

test.describe("localStorage Persistence", () => {
  test("should save and restore stack selection", async ({ page }) => {
    // Navigate to home
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Select a stack
    await page
      .locator("[data-testid='stack-picker']")
      .first()
      .selectOption("aronson");
    await page.waitForLoadState("networkidle");

    // Verify localStorage (Mantine's useLocalStorage stores JSON stringified values)
    const savedStack = await page.evaluate(() => {
      return localStorage.getItem("memdeck-app-stack");
    });
    expect(savedStack).toBe('"aronson"');

    // Reload page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Stack should still be selected
    const selectedValue = await page
      .locator("[data-testid='stack-picker']")
      .first()
      .inputValue();
    expect(selectedValue).toBe("aronson");

    // Stack name should be displayed in main content
    await expect(page.getByRole("main").getByText("Aronson")).toBeVisible();
  });

  test("should save and restore flashcard mode", async ({ page }) => {
    // Navigate to home and select stack
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page
      .locator("[data-testid='stack-picker']")
      .first()
      .selectOption("mnemonica");
    await page.waitForLoadState("networkidle");

    // Navigate to flashcard
    await page.locator("a:has-text('Flashcard')").first().click();
    await page.waitForLoadState("networkidle");

    // Open options and change mode
    await page.getByRole("button", { name: "Flashcard settings" }).click();
    await page.waitForTimeout(300);

    // Select card-only mode
    await page.locator("text=Card only").first().click();
    await page.waitForTimeout(300);

    // Verify localStorage (Mantine's useLocalStorage stores JSON stringified values)
    const savedMode = await page.evaluate(() => {
      return localStorage.getItem("memdeck-app-flashcard-option");
    });
    expect(savedMode).toBe('"cardonly"');

    // Close options
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    // Reload page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Mode should still be card-only
    const mode = await page.evaluate(() => {
      return localStorage.getItem("memdeck-app-flashcard-option");
    });
    expect(mode).toBe('"cardonly"');
  });

  test("should save and restore color scheme", async ({ page }) => {
    // Navigate to home
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Toggle to dark theme using the switch track (Mantine hides the actual checkbox)
    const themeSwitchTrack = page.locator(".mantine-Switch-track").first();
    const themeSwitchInput = page.locator("input[type='checkbox']").first();
    const isLight = await themeSwitchInput.isChecked();

    if (isLight) {
      await themeSwitchTrack.click();
      await page.waitForTimeout(300);
    }

    // Verify localStorage (color scheme is stored as plain string, not JSON stringified)
    const savedScheme = await page.evaluate(() => {
      return localStorage.getItem("memdeck-app-color-scheme");
    });
    expect(savedScheme).toBe("dark");

    // Reload page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Theme should still be dark
    const reloadedSwitch = page.locator("input[type='checkbox']").first();
    const reloadedIsLight = await reloadedSwitch.isChecked();
    expect(reloadedIsLight).toBe(!isLight);
  });

  test("should maintain multiple settings together", async ({ page }) => {
    // Navigate and set multiple preferences
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Set stack
    await page
      .locator("[data-testid='stack-picker']")
      .first()
      .selectOption("redford");
    await page.waitForLoadState("networkidle");

    // Navigate to flashcard and set mode
    await page.locator("a:has-text('Flashcard')").first().click();
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "Flashcard settings" }).click();
    await page.waitForTimeout(300);

    await page.locator("text=Number only").first().click();
    await page.waitForTimeout(300);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    // Set theme to dark (use switch track, Mantine hides the actual checkbox)
    const themeSwitchTrack = page.locator(".mantine-Switch-track").first();
    const themeSwitchInput = page.locator("input[type='checkbox']").first();
    const isLight = await themeSwitchInput.isChecked();
    if (isLight) {
      await themeSwitchTrack.click();
      await page.waitForTimeout(300);
    }

    // Reload and verify all settings persist
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Check stack
    const selectedValue = await page
      .locator("[data-testid='stack-picker']")
      .first()
      .inputValue();
    expect(selectedValue).toBe("redford");

    // Navigate to flashcard
    await page.locator("a:has-text('Flashcard')").first().click();
    await page.waitForLoadState("networkidle");

    // Check mode (Mantine's useLocalStorage stores JSON stringified values)
    const mode = await page.evaluate(() => {
      return localStorage.getItem("memdeck-app-flashcard-option");
    });
    expect(mode).toBe('"numberonly"');

    // Check theme (color scheme is stored as plain string)
    const scheme = await page.evaluate(() => {
      return localStorage.getItem("memdeck-app-color-scheme");
    });
    expect(scheme).toBe("dark");
  });

  test("should handle localStorage across different browser tabs", async ({
    page,
    context,
  }) => {
    // In first tab, set preferences
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page
      .locator("[data-testid='stack-picker']")
      .first()
      .selectOption("particle");
    await page.waitForLoadState("networkidle");

    // Create a new page in same context (simulates new tab)
    const page2 = await context.newPage();

    // Navigate to home in second tab
    await page2.goto("/");
    await page2.waitForLoadState("networkidle");

    // Stack selection should be visible in second tab
    const selectedValue = await page2
      .locator("[data-testid='stack-picker']")
      .first()
      .inputValue();
    expect(selectedValue).toBe("particle");

    await page2.close();
  });

  test("should clear localStorage when explicitly cleared", async ({
    page,
  }) => {
    // Navigate and set preferences
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page
      .locator("[data-testid='stack-picker']")
      .first()
      .selectOption("memorandum");
    await page.waitForLoadState("networkidle");

    // Verify it's saved (Mantine's useLocalStorage stores JSON stringified values)
    const savedStack = await page.evaluate(() => {
      return localStorage.getItem("memdeck-app-stack");
    });
    expect(savedStack).toBe('"memorandum"');

    // Clear localStorage via JavaScript
    await page.evaluate(() => {
      localStorage.clear();
    });

    // Reload
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Stack should be reset - verify the select has empty value
    const selectedValue = await page
      .locator("[data-testid='stack-picker']")
      .first()
      .inputValue();
    expect(selectedValue).toBe("");

    // After reload, app re-initializes localStorage with default empty value
    const clearedStack = await page.evaluate(() => {
      return localStorage.getItem("memdeck-app-stack");
    });
    expect(clearedStack).toBe('""'); // JSON stringified empty string
  });

  test("should not lose settings during rapid navigation", async ({ page }) => {
    // Navigate to home
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Set stack
    await page
      .locator("[data-testid='stack-picker']")
      .first()
      .selectOption("mnemonica");
    await page.waitForLoadState("networkidle");

    // Navigate rapidly between pages
    await page.locator("a:has-text('Flashcard')").first().click();
    await page.waitForLoadState("networkidle");

    await page.locator("a:has-text('Home')").first().click();
    await page.waitForLoadState("networkidle");

    await page.locator("a:has-text('Resources')").first().click();
    await page.waitForLoadState("networkidle");

    await page.locator("a:has-text('Home')").first().click();
    await page.waitForLoadState("networkidle");

    // Stack should still be selected
    const selectedValue = await page
      .locator("[data-testid='stack-picker']")
      .first()
      .inputValue();
    expect(selectedValue).toBe("mnemonica");
  });
});
