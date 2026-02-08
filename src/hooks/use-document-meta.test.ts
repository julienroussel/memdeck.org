import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildCanonicalUrl,
  formatTitle,
  useDocumentMeta,
} from "./use-document-meta";

describe("formatTitle", () => {
  it("returns the title as-is when it already contains the site name", () => {
    expect(formatTitle("MemDeck")).toBe("MemDeck");
    expect(formatTitle("MemDeck — Mastering memorized deck")).toBe(
      "MemDeck — Mastering memorized deck"
    );
  });

  it.each([
    "Flashcard Training",
    "Guide",
    "Stats",
    "ACAAN Training",
  ])('formats "%s" as "<title> | MemDeck"', (title) => {
    expect(formatTitle(title)).toBe(`${title} | MemDeck`);
  });
});

describe("buildCanonicalUrl", () => {
  it("builds canonical URL for root path", () => {
    expect(buildCanonicalUrl("/")).toBe("https://memdeck.org/");
  });

  it.each([
    "/flashcard",
    "/guide",
    "/acaan",
    "/stats",
  ])("builds canonical URL for %s", (path) => {
    expect(buildCanonicalUrl(path)).toBe(`https://memdeck.org${path}`);
  });
});

// Mock react-router's useLocation hook
vi.mock("react-router", () => ({
  useLocation: vi.fn(() => ({ pathname: "/test" })),
}));

// Manual useEffect mock: vitest runs in node environment without DOM rendering.
// Since @testing-library/react is not installed, we capture the effect callback
// directly to test the hook's side effects on the mocked document.
let capturedEffect: (() => undefined | (() => void)) | null = null;
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useEffect: vi.fn((effect: () => undefined | (() => void)) => {
      capturedEffect = effect;
    }),
  };
});

describe("useDocumentMeta", () => {
  let mockDocument: {
    title: string;
    querySelector: ReturnType<typeof vi.fn>;
  };
  let mockElements: Record<string, { content: string } | { href: string }>;

  // Pre-typed mock elements — avoids `as` casts when asserting later
  const descEl = { content: "Default description" };
  const ogTitleEl = { content: "Default OG Title" };
  const ogDescEl = { content: "Default OG Description" };
  const ogUrlEl = { content: "https://memdeck.org/" };
  const twitterUrlEl = { content: "https://memdeck.org/" };
  const twitterTitleEl = { content: "Default Twitter Title" };
  const twitterDescEl = { content: "Default Twitter Description" };
  const canonicalEl = { href: "https://memdeck.org/" };

  beforeEach(() => {
    capturedEffect = null;

    // Reset element values for each test
    descEl.content = "Default description";
    ogTitleEl.content = "Default OG Title";
    ogDescEl.content = "Default OG Description";
    ogUrlEl.content = "https://memdeck.org/";
    twitterUrlEl.content = "https://memdeck.org/";
    twitterTitleEl.content = "Default Twitter Title";
    twitterDescEl.content = "Default Twitter Description";
    canonicalEl.href = "https://memdeck.org/";

    // Create per-selector mock elements so each tag can be tracked individually
    mockElements = {
      'meta[name="description"]': descEl,
      'meta[property="og:title"]': ogTitleEl,
      'meta[property="og:description"]': ogDescEl,
      'meta[property="og:url"]': ogUrlEl,
      'meta[property="twitter:url"]': twitterUrlEl,
      'meta[property="twitter:title"]': twitterTitleEl,
      'meta[property="twitter:description"]': twitterDescEl,
      'link[rel="canonical"]': canonicalEl,
    };

    mockDocument = {
      title: "MemDeck",
      querySelector: vi.fn(
        (selector: string) => mockElements[selector] ?? null
      ),
    };

    // Replace global document with mock
    vi.stubGlobal("document", mockDocument);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sets document.title correctly", () => {
    useDocumentMeta({
      title: "Flashcard Training",
      description: "Test description",
    });

    // Execute the captured effect
    if (capturedEffect) {
      capturedEffect();
    }

    expect(mockDocument.title).toBe("Flashcard Training | MemDeck");
  });

  it("restores document.title to MemDeck on unmount", () => {
    useDocumentMeta({
      title: "Guide",
      description: "Test description",
    });

    // Execute the captured effect and get cleanup function
    let cleanup: (() => void) | undefined;
    if (capturedEffect) {
      cleanup = capturedEffect();
    }

    expect(mockDocument.title).toBe("Guide | MemDeck");

    // Execute cleanup function (simulating unmount)
    if (typeof cleanup === "function") {
      cleanup();
    }

    expect(mockDocument.title).toBe("MemDeck");
  });

  it("restores all meta tags and canonical link on unmount", () => {
    useDocumentMeta({
      title: "Stats",
      description: "Stats page description",
    });

    let cleanup: (() => void) | undefined;
    if (capturedEffect) {
      cleanup = capturedEffect();
    }

    // Verify meta tags were set to new values
    expect(descEl.content).toBe("Stats page description");
    expect(ogTitleEl.content).toBe("Stats | MemDeck");
    expect(ogDescEl.content).toBe("Stats page description");
    expect(ogUrlEl.content).toBe("https://memdeck.org/test");
    expect(twitterUrlEl.content).toBe("https://memdeck.org/test");
    expect(twitterTitleEl.content).toBe("Stats | MemDeck");
    expect(twitterDescEl.content).toBe("Stats page description");
    expect(canonicalEl.href).toBe("https://memdeck.org/test");

    // Execute cleanup function (simulating unmount)
    if (typeof cleanup === "function") {
      cleanup();
    }

    // Verify all values are restored to their originals
    expect(mockDocument.title).toBe("MemDeck");
    expect(descEl.content).toBe("Default description");
    expect(ogTitleEl.content).toBe("Default OG Title");
    expect(ogDescEl.content).toBe("Default OG Description");
    expect(ogUrlEl.content).toBe("https://memdeck.org/");
    expect(twitterUrlEl.content).toBe("https://memdeck.org/");
    expect(twitterTitleEl.content).toBe("Default Twitter Title");
    expect(twitterDescEl.content).toBe("Default Twitter Description");
    expect(canonicalEl.href).toBe("https://memdeck.org/");
  });
});
