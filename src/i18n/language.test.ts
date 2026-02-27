import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LANGUAGE_LSK } from "../constants";
import { createMockLocalStorage } from "../test-utils/mock-local-storage";
import {
  changeLanguage,
  detectLanguage,
  isSupportedLanguage,
  LANGUAGE_CODES,
  SUPPORTED_LANGUAGES,
} from "./language";

vi.mock("i18next", () => ({
  default: {
    hasResourceBundle: vi.fn(),
    addResourceBundle: vi.fn(),
    changeLanguage: vi.fn(),
  },
}));

const { storage, mockLocalStorage } = createMockLocalStorage();

Object.defineProperty(globalThis, "localStorage", {
  value: mockLocalStorage,
  writable: true,
});

beforeEach(() => {
  storage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SUPPORTED_LANGUAGES", () => {
  it("contains en, fr, es, de, it, nl, pt", () => {
    expect(SUPPORTED_LANGUAGES).toEqual([
      "en",
      "fr",
      "es",
      "de",
      "it",
      "nl",
      "pt",
    ]);
  });
});

describe("LANGUAGE_CODES", () => {
  it("has an entry for every supported language", () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      expect(LANGUAGE_CODES).toHaveProperty(lang);
    }
  });

  it("maps each language to its uppercase ISO code", () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      expect(LANGUAGE_CODES[lang]).toBe(lang.toUpperCase());
    }
  });
});

describe("detectLanguage", () => {
  it("returns stored language from localStorage when valid", () => {
    storage.set(LANGUAGE_LSK, "fr");
    expect(detectLanguage()).toBe("fr");
  });

  it("ignores invalid stored language and falls back to browser", () => {
    storage.set(LANGUAGE_LSK, "xx");
    vi.stubGlobal("navigator", { language: "es-MX" });
    expect(detectLanguage()).toBe("es");
  });

  it("detects browser language when no stored value", () => {
    vi.stubGlobal("navigator", { language: "de-DE" });
    expect(detectLanguage()).toBe("de");
  });

  it("falls back to en for unsupported browser language", () => {
    vi.stubGlobal("navigator", { language: "ja-JP" });
    expect(detectLanguage()).toBe("en");
  });

  it("falls back to en when both storage and browser are unsupported", () => {
    storage.set(LANGUAGE_LSK, "zz");
    vi.stubGlobal("navigator", { language: "ko" });
    expect(detectLanguage()).toBe("en");
  });

  it("falls back to browser language when localStorage.getItem throws", () => {
    vi.spyOn(mockLocalStorage, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    vi.stubGlobal("navigator", { language: "fr-FR" });
    expect(detectLanguage()).toBe("fr");
  });

  it("falls back to en when localStorage.getItem throws and browser language is unsupported", () => {
    vi.spyOn(mockLocalStorage, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    vi.stubGlobal("navigator", { language: "ja-JP" });
    expect(detectLanguage()).toBe("en");
  });
});

describe("isSupportedLanguage", () => {
  it("returns true for en", () => {
    expect(isSupportedLanguage("en")).toBe(true);
  });

  it("returns true for fr", () => {
    expect(isSupportedLanguage("fr")).toBe(true);
  });

  it("returns true for es", () => {
    expect(isSupportedLanguage("es")).toBe(true);
  });

  it("returns true for de", () => {
    expect(isSupportedLanguage("de")).toBe(true);
  });

  it("returns true for it", () => {
    expect(isSupportedLanguage("it")).toBe(true);
  });

  it("returns true for nl", () => {
    expect(isSupportedLanguage("nl")).toBe(true);
  });

  it("returns true for pt", () => {
    expect(isSupportedLanguage("pt")).toBe(true);
  });

  it("returns false for unsupported language ja", () => {
    expect(isSupportedLanguage("ja")).toBe(false);
  });

  it("returns false for unsupported language xx", () => {
    expect(isSupportedLanguage("xx")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isSupportedLanguage("")).toBe(false);
  });
});

describe("changeLanguage", () => {
  let mockI18n: {
    hasResourceBundle: ReturnType<typeof vi.fn>;
    addResourceBundle: ReturnType<typeof vi.fn>;
    changeLanguage: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    const i18nModule = await import("i18next");
    mockI18n = i18nModule.default as unknown as typeof mockI18n;
    mockI18n.hasResourceBundle.mockClear();
    mockI18n.addResourceBundle.mockClear();
    mockI18n.changeLanguage.mockClear();
    mockI18n.changeLanguage.mockResolvedValue(undefined);
  });

  it("switches to en without loading any bundle", async () => {
    mockI18n.hasResourceBundle.mockReturnValue(false);

    await changeLanguage("en");

    expect(mockI18n.hasResourceBundle).toHaveBeenCalledWith(
      "en",
      "translation"
    );
    expect(mockI18n.addResourceBundle).not.toHaveBeenCalled();
    expect(mockI18n.changeLanguage).toHaveBeenCalledWith("en");
    expect(storage.get(LANGUAGE_LSK)).toBe("en");
    expect(document.documentElement.lang).toBe("en");
  });

  it("switches to fr and loads the French bundle when not cached", async () => {
    mockI18n.hasResourceBundle.mockReturnValue(false);

    await changeLanguage("fr");

    expect(mockI18n.hasResourceBundle).toHaveBeenCalledWith(
      "fr",
      "translation"
    );
    expect(mockI18n.addResourceBundle).toHaveBeenCalledWith(
      "fr",
      "translation",
      expect.any(Object)
    );
    expect(mockI18n.changeLanguage).toHaveBeenCalledWith("fr");
    expect(storage.get(LANGUAGE_LSK)).toBe("fr");
    expect(document.documentElement.lang).toBe("fr");
  });

  it("switches to es and loads the Spanish bundle when not cached", async () => {
    mockI18n.hasResourceBundle.mockReturnValue(false);

    await changeLanguage("es");

    expect(mockI18n.hasResourceBundle).toHaveBeenCalledWith(
      "es",
      "translation"
    );
    expect(mockI18n.addResourceBundle).toHaveBeenCalledWith(
      "es",
      "translation",
      expect.any(Object)
    );
    expect(mockI18n.changeLanguage).toHaveBeenCalledWith("es");
    expect(storage.get(LANGUAGE_LSK)).toBe("es");
    expect(document.documentElement.lang).toBe("es");
  });

  it("switches to de and loads the German bundle when not cached", async () => {
    mockI18n.hasResourceBundle.mockReturnValue(false);

    await changeLanguage("de");

    expect(mockI18n.hasResourceBundle).toHaveBeenCalledWith(
      "de",
      "translation"
    );
    expect(mockI18n.addResourceBundle).toHaveBeenCalledWith(
      "de",
      "translation",
      expect.any(Object)
    );
    expect(mockI18n.changeLanguage).toHaveBeenCalledWith("de");
    expect(storage.get(LANGUAGE_LSK)).toBe("de");
    expect(document.documentElement.lang).toBe("de");
  });

  it("switches to it and loads the Italian bundle when not cached", async () => {
    mockI18n.hasResourceBundle.mockReturnValue(false);

    await changeLanguage("it");

    expect(mockI18n.hasResourceBundle).toHaveBeenCalledWith(
      "it",
      "translation"
    );
    expect(mockI18n.addResourceBundle).toHaveBeenCalledWith(
      "it",
      "translation",
      expect.any(Object)
    );
    expect(mockI18n.changeLanguage).toHaveBeenCalledWith("it");
    expect(storage.get(LANGUAGE_LSK)).toBe("it");
    expect(document.documentElement.lang).toBe("it");
  });

  it("switches to nl and loads the Dutch bundle when not cached", async () => {
    mockI18n.hasResourceBundle.mockReturnValue(false);

    await changeLanguage("nl");

    expect(mockI18n.hasResourceBundle).toHaveBeenCalledWith(
      "nl",
      "translation"
    );
    expect(mockI18n.addResourceBundle).toHaveBeenCalledWith(
      "nl",
      "translation",
      expect.any(Object)
    );
    expect(mockI18n.changeLanguage).toHaveBeenCalledWith("nl");
    expect(storage.get(LANGUAGE_LSK)).toBe("nl");
    expect(document.documentElement.lang).toBe("nl");
  });

  it("switches to pt and loads the Portuguese bundle when not cached", async () => {
    mockI18n.hasResourceBundle.mockReturnValue(false);

    await changeLanguage("pt");

    expect(mockI18n.hasResourceBundle).toHaveBeenCalledWith(
      "pt",
      "translation"
    );
    expect(mockI18n.addResourceBundle).toHaveBeenCalledWith(
      "pt",
      "translation",
      expect.any(Object)
    );
    expect(mockI18n.changeLanguage).toHaveBeenCalledWith("pt");
    expect(storage.get(LANGUAGE_LSK)).toBe("pt");
    expect(document.documentElement.lang).toBe("pt");
  });

  it("switches to fr without loading when bundle is already cached", async () => {
    mockI18n.hasResourceBundle.mockReturnValue(true);

    await changeLanguage("fr");

    expect(mockI18n.hasResourceBundle).toHaveBeenCalledWith(
      "fr",
      "translation"
    );
    expect(mockI18n.addResourceBundle).not.toHaveBeenCalled();
    expect(mockI18n.changeLanguage).toHaveBeenCalledWith("fr");
    expect(storage.get(LANGUAGE_LSK)).toBe("fr");
    expect(document.documentElement.lang).toBe("fr");
  });

  it("sets localStorage correctly when changing language", async () => {
    mockI18n.hasResourceBundle.mockReturnValue(true);

    await changeLanguage("fr");
    expect(storage.get(LANGUAGE_LSK)).toBe("fr");

    await changeLanguage("es");
    expect(storage.get(LANGUAGE_LSK)).toBe("es");

    await changeLanguage("en");
    expect(storage.get(LANGUAGE_LSK)).toBe("en");
  });

  it("sets document.documentElement.lang correctly when changing language", async () => {
    mockI18n.hasResourceBundle.mockReturnValue(true);

    await changeLanguage("fr");
    expect(document.documentElement.lang).toBe("fr");

    await changeLanguage("de");
    expect(document.documentElement.lang).toBe("de");

    await changeLanguage("en");
    expect(document.documentElement.lang).toBe("en");
  });

  it("propagates loader error when dynamic import fails", async () => {
    mockI18n.hasResourceBundle.mockReturnValue(false);

    const { languageLoaders } = await import("./language");
    vi.spyOn(languageLoaders, "fr").mockRejectedValue(
      new Error("Network error")
    );

    await expect(changeLanguage("fr")).rejects.toThrow("Network error");
  });

  it("does not throw when localStorage.setItem throws", async () => {
    mockI18n.hasResourceBundle.mockReturnValue(true);
    vi.spyOn(mockLocalStorage, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    await changeLanguage("fr");

    expect(mockI18n.changeLanguage).toHaveBeenCalledWith("fr");
    expect(document.documentElement.lang).toBe("fr");
  });

  it("discards a stale call when a newer changeLanguage call is made", async () => {
    mockI18n.hasResourceBundle.mockReturnValue(false);

    const { languageLoaders } = await import("./language");

    let resolveFr:
      | ((value: { default: Record<string, unknown> }) => void)
      | undefined;
    const frPromise = new Promise<{ default: Record<string, unknown> }>(
      (resolve) => {
        resolveFr = resolve;
      }
    );
    vi.spyOn(languageLoaders, "fr").mockReturnValue(frPromise);

    // Start slow "fr" call (call A) — do not await
    const callA = changeLanguage("fr");

    // Start "es" call (call B) — this supersedes call A
    const callB = changeLanguage("es");

    // Now resolve call A's loader after call B has already started
    resolveFr?.({ default: { greeting: "Bonjour" } });

    await Promise.all([callA, callB]);

    // Only "es" should have persisted — call A was stale
    expect(storage.get(LANGUAGE_LSK)).toBe("es");
    expect(document.documentElement.lang).toBe("es");
  });
});
