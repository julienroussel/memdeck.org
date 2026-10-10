import { expect } from "@playwright/test";
import { test } from "./fixtures/test-setup";

const FRENCH_SUIT_PATTERN = /Cœur|Pique|Trèfle|Carreau/;

test.describe("Language & i18n", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("should default to English on first visit", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Master your memorized deck" })
    ).toBeVisible();

    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  test("should display language picker in header", async ({ page }) => {
    const picker = page.locator("[data-testid='language-picker']");
    await expect(picker).toBeVisible();
    await expect(picker).toHaveValue("en");
  });

  test("should switch to French via language picker", async ({ page }) => {
    const picker = page.locator("[data-testid='language-picker']");
    await picker.selectOption("fr");

    await expect(
      page.getByRole("heading", { name: "Maîtrisez votre jeu mémorisé" })
    ).toBeVisible();

    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  });

  test("should switch to Spanish via language picker", async ({ page }) => {
    const picker = page.locator("[data-testid='language-picker']");
    await picker.selectOption("es");

    await expect(
      page.getByRole("heading", { name: "Domina tu baraja memorizada" })
    ).toBeVisible();
  });

  test("should switch to German via language picker", async ({ page }) => {
    const picker = page.locator("[data-testid='language-picker']");
    await picker.selectOption("de");

    await expect(
      page.getByRole("heading", {
        name: "Meistere dein memoriertes Kartendeck",
      })
    ).toBeVisible();
  });

  test("should switch to Italian via language picker", async ({ page }) => {
    const picker = page.locator("[data-testid='language-picker']");
    await picker.selectOption("it");

    await expect(
      page.getByRole("heading", {
        name: "Padroneggia il tuo mazzo memorizzato",
      })
    ).toBeVisible();
  });

  test("should switch to Dutch via language picker", async ({ page }) => {
    const picker = page.locator("[data-testid='language-picker']");
    await picker.selectOption("nl");

    await expect(
      page.getByRole("heading", {
        name: "Beheers je gememoriseerde kaartspel",
      })
    ).toBeVisible();
  });

  test("should switch to Portuguese via language picker", async ({ page }) => {
    const picker = page.locator("[data-testid='language-picker']");
    await picker.selectOption("pt");

    await expect(
      page.getByRole("heading", {
        name: "Domine o seu baralho memorizado",
      })
    ).toBeVisible();
  });

  test("should persist language selection across page reloads", async ({
    page,
  }) => {
    const picker = page.locator("[data-testid='language-picker']");
    await picker.selectOption("fr");

    // Verify French is active
    await expect(
      page.getByRole("heading", { name: "Maîtrisez votre jeu mémorisé" })
    ).toBeVisible();

    // Reload
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Should still be French
    await expect(
      page.getByRole("heading", { name: "Maîtrisez votre jeu mémorisé" })
    ).toBeVisible();

    const reloadedPicker = page.locator("[data-testid='language-picker']");
    await expect(reloadedPicker).toHaveValue("fr");

    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  });

  test("should persist language in localStorage", async ({ page }) => {
    const picker = page.locator("[data-testid='language-picker']");
    await picker.selectOption("de");

    // Wait for the German translation to appear, confirming the language switch completed
    await expect(
      page.getByRole("heading", {
        name: "Meistere dein memoriertes Kartendeck",
      })
    ).toBeVisible();

    const storedLang = await page.evaluate(() =>
      localStorage.getItem("memdeck-app-language")
    );

    expect(storedLang).toBe("de");
  });

  test("should update html lang attribute on language change", async ({
    page,
  }) => {
    await expect(page.locator("html")).toHaveAttribute("lang", "en");

    const picker = page.locator("[data-testid='language-picker']");
    await picker.selectOption("es");

    // Wait for the Spanish translation to confirm the language switch completed
    await expect(
      page.getByRole("heading", { name: "Domina tu baraja memorizada" })
    ).toBeVisible();

    await expect(page.locator("html")).toHaveAttribute("lang", "es");

    await picker.selectOption("de");

    // Wait for the German translation to confirm the language switch completed
    await expect(
      page.getByRole("heading", {
        name: "Meistere dein memoriertes Kartendeck",
      })
    ).toBeVisible();

    await expect(page.locator("html")).toHaveAttribute("lang", "de");
  });

  test("should translate card names in flashcard mode", async ({ page }) => {
    // Select a stack to enable flashcard mode
    await page
      .locator("[data-testid='stack-picker']")
      .first()
      .selectOption("mnemonica");

    // Switch to French
    const picker = page.locator("[data-testid='language-picker']");
    await picker.selectOption("fr");

    // Wait for French UI to confirm the language switch completed (returning-user heading after stack selection)
    await expect(page.locator("text=Prêt à vous entraîner ?")).toBeVisible();

    // Navigate to flashcard page
    await page.locator("a:has-text('Flashcard')").first().click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Flashcard" })
    ).toBeVisible();

    // Card names should be translated to French (visible in flashcard prompt image alt text).
    // The first round always prompts with a card, so no answer is clicked here:
    // answering would randomise the next prompt in "both" mode.
    const frenchSuitCard = page.getByRole("img", {
      name: FRENCH_SUIT_PATTERN,
    });
    await expect(frenchSuitCard.first()).toBeVisible();
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
    await expect(
      page.getByRole("heading", { name: "Domina tu baraja memorizada" })
    ).toBeVisible();

    // Navigate to resources
    await page.locator("a:has-text('Recursos')").first().click();

    // Should still be in Spanish
    await expect(
      page.locator("text=Recursos de barajas memorizadas")
    ).toBeVisible();

    // Navigate to guide
    await page.locator("a:has-text('Gu\u00eda')").first().click();

    // Should still be in Spanish
    await expect(
      page.getByRole("heading", { level: 1, name: "Gu\u00eda" })
    ).toBeVisible();
  });
});
