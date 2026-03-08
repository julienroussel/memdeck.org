import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ROUTES } from "./constants";

const STARTS_WITH_SLASH = /^\//;

/**
 * Compile-time exhaustiveness check: if ROUTES gains or loses a key,
 * update RoutesUsed below. The type error will point you here.
 */
type RoutesUsed =
  | "home"
  | "guide"
  | "resources"
  | "flashcard"
  | "spotCheck"
  | "acaan"
  | "toolbox"
  | "stats"
  | "about";

type AssertRoutesExhaustive = [
  Exclude<keyof typeof ROUTES, RoutesUsed>,
  Exclude<RoutesUsed, keyof typeof ROUTES>,
] extends [never, never]
  ? true
  : never;

const exhaustiveCheck: AssertRoutesExhaustive = true;

describe("ROUTES", () => {
  it("has a matching RoutesUsed entry for every key (compile-time check)", () => {
    expect(exhaustiveCheck).toBe(true);
  });

  it("contains only valid path strings starting with /", () => {
    for (const path of Object.values(ROUTES)) {
      expect(path).toMatch(STARTS_WITH_SLASH);
    }
  });

  it("matches the URLs listed in lighthouserc.json", () => {
    const configPath = join(import.meta.dirname, "..", "lighthouserc.json");
    const config = JSON.parse(readFileSync(configPath, "utf-8")) as {
      ci: { collect: { url: readonly string[] } };
    };
    const lighthouseUrls = config.ci.collect.url;

    const expectedUrls = Object.values(ROUTES).map((route) =>
      route === "/"
        ? "http://localhost/index.html"
        : `http://localhost${route}/index.html`
    );

    expect(new Set(lighthouseUrls)).toEqual(new Set(expectedUrls));
  });
});
