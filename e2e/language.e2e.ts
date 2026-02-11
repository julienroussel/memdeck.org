import { expect } from "@playwright/test";
import { test } from "./fixtures/test-setup";

test.describe("Language & i18n", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("should default to English on first visit", async ({ page }) => {
    await expect(page.locator("text=Welcome to MemDeck")).toBeVisible();

    const htmlLang = await page.getAttribute("html", "lang");
    expect(htmlLang).toBe("en");
  });

  test("should display language picker in header", async ({ page }) => {
    const picker = page.locator("[data-testid='language-picker']");
    await expect(picker).toBeVisible();
    await expect(picker).toHaveValue("en");
  });

  test("should switch to French via language picker", async ({ page }) => {
    const picker = page.locator("[data-testid='language-picker']");
    await picker.selectOption("fr");

    await expect(page.locator("text=Bienvenue sur MemDeck")).toBeVisible();

    const htmlLang = await page.getAttribute("html", "lang");
    expect(htmlLang).toBe("fr");
  });

  test("should switch to Spanish via language picker", async ({ page }) => {
    const picker = page.locator("[data-testid='language-picker']");
    await picker.selectOption("es");

    await expect(page.locator("text=Bienvenido a MemDeck")).toBeVisible();
  });

  test("should switch to German via language picker", async ({ page }) => {
    const picker = page.locator("[data-testid='language-picker']");
    await picker.selectOption("de");

    await expect(page.locator("text=Willkommen bei MemDeck")).toBeVisible();
  });

  test("should persist language selection across page reloads", async ({
    page,
  }) => {
    const picker = page.locator("[data-testid='language-picker']");
    await picker.selectOption("fr");

    // Verify French is active
    await expect(page.locator("text=Bienvenue sur MemDeck")).toBeVisible();

    // Reload
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Should still be French
    await expect(page.locator("text=Bienvenue sur MemDeck")).toBeVisible();

    const reloadedPicker = page.locator("[data-testid='language-picker']");
    await expect(reloadedPicker).toHaveValue("fr");

    const htmlLang = await page.getAttribute("html", "lang");
    expect(htmlLang).toBe("fr");
  });

  test("should persist language in localStorage", async ({ page }) => {
    const picker = page.locator("[data-testid='language-picker']");
    await picker.selectOption("de");

    // Wait for the German translation to appear, confirming the language switch completed
    await expect(page.locator("text=Willkommen bei MemDeck")).toBeVisible();

    const storedLang = await page.evaluate(() => {
      return localStorage.getItem("memdeck-app-language");
    });

    expect(storedLang).toBe("de");
  });

  test("should update html lang attribute on language change", async ({
    page,
  }) => {
    expect(await page.getAttribute("html", "lang")).toBe("en");

    const picker = page.locator("[data-testid='language-picker']");
    await picker.selectOption("es");

    // Wait for the Spanish translation to confirm the language switch completed
    await expect(page.locator("text=Bienvenido a MemDeck")).toBeVisible();

    expect(await page.getAttribute("html", "lang")).toBe("es");

    await picker.selectOption("de");

    // Wait for the German translation to confirm the language switch completed
    await expect(page.locator("text=Willkommen bei MemDeck")).toBeVisible();

    expect(await page.getAttribute("html", "lang")).toBe("de");
  });

  test("should keep card names in English regardless of language", async ({
    page,
  }) => {
    // Select a stack to enable flashcard mode
    await page.locator("select").first().selectOption("mnemonica");
    await page.waitForLoadState("networkidle");

    // Switch to French
    const picker = page.locator("[data-testid='language-picker']");
    await picker.selectOption("fr");

    // Wait for French UI to confirm the language switch completed
    await expect(page.locator("text=Bienvenue sur MemDeck")).toBeVisible();

    // Navigate to flashcard page
    await page.locator("a:has-text('Flashcard')").first().click();
    await page.waitForLoadState("networkidle");

    // Start a session
    const startButton = page
      .locator("button:has-text('10')")
      .or(page.locator("[aria-label*='questions']").first());
    if (await startButton.isVisible()) {
      await startButton.click();
    }

    // Wait for a card with an English suit name to appear on the page
    const englishSuitPattern = page.locator(
      "text=/Hearts|Spades|Clubs|Diamonds/"
    );
    await expect(englishSuitPattern.first()).toBeVisible();
  });

  test("should translate navigation links", async ({ page }) => {
    // English nav
    await expect(page.locator("a:has-text('Home')").first()).toBeVisible();
    await expect(page.locator("a:has-text('Guide')").first()).toBeVisible();
    await expect(page.locator("a:has-text('Resources')").first()).toBeVisible();

    // Switch to French
    const picker = page.locator("[data-testid='language-picker']");
    await picker.selectOption("fr");

    // French nav
    await expect(page.locator("a:has-text('Accueil')").first()).toBeVisible();
    await expect(page.locator("a:has-text('Guide')").first()).toBeVisible();
    await expect(
      page.locator("a:has-text('Ressources')").first()
    ).toBeVisible();
  });

  test("should maintain language across page navigation", async ({ page }) => {
    const picker = page.locator("[data-testid='language-picker']");
    await picker.selectOption("es");

    // Wait for Spanish UI to confirm the language switch completed
    await expect(page.locator("text=Bienvenido a MemDeck")).toBeVisible();

    // Navigate to resources
    await page.locator("a:has-text('Recursos')").first().click();
    await page.waitForLoadState("networkidle");

    // Should still be in Spanish
    await expect(
      page.locator("text=Recursos de barajas memorizadas")
    ).toBeVisible();

    // Navigate to guide
    await page.locator("a:has-text('Gu\u00eda')").first().click();
    await page.waitForLoadState("networkidle");

    // Should still be in Spanish
    await expect(page.locator("text=Gu\u00eda")).toBeVisible();
  });
});
