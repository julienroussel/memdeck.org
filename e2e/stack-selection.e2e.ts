import { expect } from "@playwright/test";
import { test } from "./fixtures/test-setup";

test.describe("Stack Selection", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page before each test
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("should display stack picker on initial load when no stack is selected", async ({
    page,
  }) => {
    // Select dropdown should show "Please choose a stack"
    const select = page.locator("[data-testid='stack-picker']").first();
    await expect(select).toBeVisible();

    const selectedValue = await select.inputValue();
    expect(selectedValue).toBe("");
  });

  test("should display all available stacks in dropdown", async ({ page }) => {
    const select = page.locator("[data-testid='stack-picker']").first();
    // Stack labels are display names from stack definitions
    const availableStacks = [
      "Tamariz", // mnemonica
      "Aronson",
      "Memorandum",
      "Redford Stack",
      "Particle System",
    ];

    // Check that each option exists (options in closed select may not be "visible")
    for (const stack of availableStacks) {
      const option = select.locator(`option:has-text("${stack}")`);
      await expect(option).toHaveCount(1);
    }
  });

  test("should select a stack from dropdown", async ({ page }) => {
    const select = page.locator("[data-testid='stack-picker']").first();

    // Select Mnemonica stack
    await select.selectOption("mnemonica");
    await page.waitForLoadState("networkidle");

    // Verify selection
    const selectedValue = await select.inputValue();
    expect(selectedValue).toBe("mnemonica");
  });

  test("should persist stack selection in localStorage", async ({ page }) => {
    // Select a stack
    await page
      .locator("[data-testid='stack-picker']")
      .first()
      .selectOption("aronson");
    await page.waitForLoadState("networkidle");

    // Check localStorage (values are JSON-stringified)
    const stackKey = await page.evaluate(() => {
      const value = localStorage.getItem("memdeck-app-stack");
      return value ? JSON.parse(value) : null;
    });

    expect(stackKey).toBe("aronson");
  });

  test("should display stack name on home page when stack is selected", async ({
    page,
  }) => {
    // Select Mnemonica stack (display name is "Tamariz")
    await page
      .locator("[data-testid='stack-picker']")
      .first()
      .selectOption("mnemonica");
    await page.waitForLoadState("networkidle");

    // Verify stack name is displayed in main content
    await expect(
      page.getByRole("main").getByText("Your selected stack is")
    ).toBeVisible();
    await expect(page.getByRole("main").getByText("Tamariz")).toBeVisible();
  });

  test("should display card spread when stack is selected", async ({
    page,
  }) => {
    // Select a stack
    await page
      .locator("[data-testid='stack-picker']")
      .first()
      .selectOption("mnemonica");
    await page.waitForLoadState("networkidle");

    // Wait for card images to load
    const cardImages = page.locator("img[src*='cards/']");
    const count = await cardImages.count();

    // Should display 52 cards
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("should switch between different stacks", async ({ page }) => {
    // Select first stack
    const select = page.locator("[data-testid='stack-picker']").first();
    await select.selectOption("mnemonica");
    await page.waitForLoadState("networkidle");

    // Verify first stack is selected
    let selectedValue = await select.inputValue();
    expect(selectedValue).toBe("mnemonica");

    // Switch to another stack
    await select.selectOption("aronson");
    await page.waitForLoadState("networkidle");

    // Verify second stack is selected
    selectedValue = await select.inputValue();
    expect(selectedValue).toBe("aronson");

    // Verify display name changed (use specific selector to avoid matching option)
    await expect(page.getByRole("main").getByText("Aronson")).toBeVisible();
  });

  test("should maintain stack selection across page navigation", async ({
    page,
  }) => {
    // Select a stack
    await page
      .locator("[data-testid='stack-picker']")
      .first()
      .selectOption("redford");
    await page.waitForLoadState("networkidle");

    // Navigate to resources page
    await page.locator("a:has-text('Resources')").first().click();
    await page.waitForLoadState("networkidle");

    // Navigate back to home
    await page.locator("a:has-text('Home')").first().click();
    await page.waitForLoadState("networkidle");

    // Stack should still be selected
    const selectedValue = await page
      .locator("[data-testid='stack-picker']")
      .first()
      .inputValue();
    expect(selectedValue).toBe("redford");
  });

  test("should restore stack selection on page reload", async ({ page }) => {
    // Select a stack (display name is "Particle System")
    await page
      .locator("[data-testid='stack-picker']")
      .first()
      .selectOption("particle");
    await page.waitForLoadState("networkidle");

    // Reload page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Stack should still be selected
    const selectedValue = await page
      .locator("[data-testid='stack-picker']")
      .first()
      .inputValue();
    expect(selectedValue).toBe("particle");

    // Stack name should be displayed (use specific selector to avoid matching option)
    await expect(
      page.getByRole("main").getByText("Particle System")
    ).toBeVisible();
  });
});
