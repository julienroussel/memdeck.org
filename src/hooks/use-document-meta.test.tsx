import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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

describe("useDocumentMeta", () => {
  let descEl: HTMLMetaElement;
  let titleEl: HTMLMetaElement;
  let ogTitleEl: HTMLMetaElement;
  let ogDescEl: HTMLMetaElement;
  let ogUrlEl: HTMLMetaElement;
  let twitterUrlEl: HTMLMetaElement;
  let twitterTitleEl: HTMLMetaElement;
  let twitterDescEl: HTMLMetaElement;
  let canonicalEl: HTMLLinkElement;

  beforeEach(() => {
    // Create real DOM elements that the hook queries
    descEl = document.createElement("meta");
    descEl.setAttribute("name", "description");
    descEl.content = "Default description";
    document.head.appendChild(descEl);

    titleEl = document.createElement("meta");
    titleEl.setAttribute("name", "title");
    titleEl.content = "Default title";
    document.head.appendChild(titleEl);

    ogTitleEl = document.createElement("meta");
    ogTitleEl.setAttribute("property", "og:title");
    ogTitleEl.content = "Default OG Title";
    document.head.appendChild(ogTitleEl);

    ogDescEl = document.createElement("meta");
    ogDescEl.setAttribute("property", "og:description");
    ogDescEl.content = "Default OG Description";
    document.head.appendChild(ogDescEl);

    ogUrlEl = document.createElement("meta");
    ogUrlEl.setAttribute("property", "og:url");
    ogUrlEl.content = "https://memdeck.org/";
    document.head.appendChild(ogUrlEl);

    twitterUrlEl = document.createElement("meta");
    twitterUrlEl.setAttribute("property", "twitter:url");
    twitterUrlEl.content = "https://memdeck.org/";
    document.head.appendChild(twitterUrlEl);

    twitterTitleEl = document.createElement("meta");
    twitterTitleEl.setAttribute("property", "twitter:title");
    twitterTitleEl.content = "Default Twitter Title";
    document.head.appendChild(twitterTitleEl);

    twitterDescEl = document.createElement("meta");
    twitterDescEl.setAttribute("property", "twitter:description");
    twitterDescEl.content = "Default Twitter Description";
    document.head.appendChild(twitterDescEl);

    canonicalEl = document.createElement("link");
    canonicalEl.setAttribute("rel", "canonical");
    canonicalEl.href = "https://memdeck.org/";
    document.head.appendChild(canonicalEl);

    // Set initial document title
    document.title = "MemDeck";
  });

  afterEach(() => {
    // Clean up DOM elements
    descEl.remove();
    titleEl.remove();
    ogTitleEl.remove();
    ogDescEl.remove();
    ogUrlEl.remove();
    twitterUrlEl.remove();
    twitterTitleEl.remove();
    twitterDescEl.remove();
    canonicalEl.remove();
  });

  it("sets document.title correctly", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={["/test"]}>{children}</MemoryRouter>
    );

    renderHook(
      () =>
        useDocumentMeta({
          title: "Flashcard Training",
          description: "Test description",
        }),
      { wrapper }
    );

    expect(document.title).toBe("Flashcard Training | MemDeck");
  });

  it("sets all meta tags and canonical link correctly", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={["/test"]}>{children}</MemoryRouter>
    );

    renderHook(
      () =>
        useDocumentMeta({
          title: "Stats",
          description: "Stats page description",
        }),
      { wrapper }
    );

    expect(document.title).toBe("Stats | MemDeck");
    expect(descEl.content).toBe("Stats page description");
    expect(titleEl.content).toBe("Stats | MemDeck");
    expect(ogTitleEl.content).toBe("Stats | MemDeck");
    expect(ogDescEl.content).toBe("Stats page description");
    expect(ogUrlEl.content).toBe("https://memdeck.org/test");
    expect(twitterUrlEl.content).toBe("https://memdeck.org/test");
    expect(twitterTitleEl.content).toBe("Stats | MemDeck");
    expect(twitterDescEl.content).toBe("Stats page description");
    expect(canonicalEl.href).toBe("https://memdeck.org/test");
  });

  it("restores document.title on unmount", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={["/test"]}>{children}</MemoryRouter>
    );

    const { unmount } = renderHook(
      () =>
        useDocumentMeta({
          title: "Guide",
          description: "Test description",
        }),
      { wrapper }
    );

    expect(document.title).toBe("Guide | MemDeck");

    unmount();

    expect(document.title).toBe("MemDeck");
  });

  it("restores all meta tags and canonical link on unmount", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={["/test"]}>{children}</MemoryRouter>
    );

    const { unmount } = renderHook(
      () =>
        useDocumentMeta({
          title: "Stats",
          description: "Stats page description",
        }),
      { wrapper }
    );

    // Verify meta tags were set to new values
    expect(document.title).toBe("Stats | MemDeck");
    expect(descEl.content).toBe("Stats page description");
    expect(titleEl.content).toBe("Stats | MemDeck");
    expect(ogTitleEl.content).toBe("Stats | MemDeck");
    expect(ogDescEl.content).toBe("Stats page description");
    expect(ogUrlEl.content).toBe("https://memdeck.org/test");
    expect(twitterUrlEl.content).toBe("https://memdeck.org/test");
    expect(twitterTitleEl.content).toBe("Stats | MemDeck");
    expect(twitterDescEl.content).toBe("Stats page description");
    expect(canonicalEl.href).toBe("https://memdeck.org/test");

    unmount();

    // Verify all values are restored to their originals
    expect(document.title).toBe("MemDeck");
    expect(descEl.content).toBe("Default description");
    expect(titleEl.content).toBe("Default title");
    expect(ogTitleEl.content).toBe("Default OG Title");
    expect(ogDescEl.content).toBe("Default OG Description");
    expect(ogUrlEl.content).toBe("https://memdeck.org/");
    expect(twitterUrlEl.content).toBe("https://memdeck.org/");
    expect(twitterTitleEl.content).toBe("Default Twitter Title");
    expect(twitterDescEl.content).toBe("Default Twitter Description");
    expect(canonicalEl.href).toBe("https://memdeck.org/");
  });
});
