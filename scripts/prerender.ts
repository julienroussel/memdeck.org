import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const DIST_DIR = join(import.meta.dirname, "..", "dist");
const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}`;
const TIMEOUT = 10_000;

const { ROUTES, SELECTED_STACK_LSK } = await import("../src/constants.ts");
const routePaths = Object.values(ROUTES);

// Error-boundary fallback headings: the English "errors.somethingWentWrong"
// string from src/components/error-boundary.tsx (translated) and the
// hardcoded copy in src/provider.tsx. No fallback carries a stable attribute,
// so the copy is the detection signal: keep in sync. Detection relies on the
// prerender context's pinned English locale below.
const ERROR_FALLBACK_HEADINGS = ["Something went wrong", "Application Error"];

// The attribute list of one start tag. Quoted values may hold `>` or
// newlines, so multi-line tags match, and lookaheads built on it find an
// attribute in any position, since index.html puts `content`/`href` first.
const TAG_ATTRS = /(?:[^>"']|"[^"]*"|'[^']*')*/.source;

type HtmlPatch = {
  label: string;
  pattern: RegExp;
  replace: (match: string) => string;
};

const attributePatch = (
  tagName: string,
  keyAttr: string,
  valueAttr: string,
  value: string
): HtmlPatch => ({
  label: `<${tagName} ${keyAttr}>`,
  pattern: new RegExp(
    String.raw`<${tagName}(?=\s)(?=${TAG_ATTRS}\s${keyAttr})(?=${TAG_ATTRS}\s${valueAttr}=")${TAG_ATTRS}>`,
    "g"
  ),
  replace: (tag) =>
    tag.replace(
      new RegExp(String.raw`(\s${valueAttr}=")[^"]*(")`),
      (_: string, p1: string, p2: string) => `${p1}${value}${p2}`
    ),
});

// Applies each patch and reports any whose target did not match exactly once,
// because String.replace silently returns its input when nothing matches.
const applyPatches = (
  source: string,
  patches: readonly HtmlPatch[]
): { html: string; failures: string[] } => {
  let html = source;
  const failures: string[] = [];
  for (const { label, pattern, replace } of patches) {
    let matches = 0;
    html = html.replace(pattern, (match: string) => {
      matches += 1;
      return replace(match);
    });
    if (matches !== 1) {
      failures.push(`${label} matched ${matches} times, expected 1`);
    }
  }
  return { failures, html };
};

// Read the original built index.html once before any modifications
const originalHtml = readFileSync(join(DIST_DIR, "index.html"), "utf-8");

// Start Vite's preview server to serve the production build
const { preview } = await import("vite");
const server = await preview({ preview: { port: PORT, strictPort: true } });

const browser = await chromium.launch();

try {
  for (const routePath of routePaths) {
    // Fresh context per route so localStorage writes from one prerendered
    // page can't leak into the next. The locale is pinned because the app
    // picks its language from navigator.language, so the output and the
    // fallback detection above would otherwise follow the machine's locale.
    const context = await browser.newContext({ locale: "en-US" });

    // Seed a stack so RequireStack pages prerender their real content.
    // useLocalDb JSON-parses stored values — a bare string is classified as
    // corrupt and ignored, so the seed must be JSON-encoded. The home route
    // stays unseeded on purpose: its prerendered HTML must keep the no-stack
    // welcome/picker that crawlers and first-time visitors should see.
    if (routePath !== ROUTES.home) {
      await context.addInitScript(
        ({ key, value }: { key: string; value: string }) => {
          localStorage.setItem(key, value);
        },
        { key: SELECTED_STACK_LSK, value: JSON.stringify("mnemonica") }
      );
    }

    const page = await context.newPage();
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });
    await page.goto(`${BASE_URL}${routePath}`, {
      timeout: TIMEOUT,
      waitUntil: "networkidle",
    });

    // Wait for splash screen to be dismissed and content to render
    await page.waitForFunction(
      () => {
        const splash = document.getElementById("splash");
        return !splash || splash.classList.contains("splash-hidden");
      },
      { timeout: TIMEOUT }
    );
    await page.waitForTimeout(300);

    // Extract the rendered content and meta values from the page
    const extracted = await page.evaluate((fallbackHeadings: string[]) => {
      const root = document.getElementById("root");
      const headings = Array.from(root?.querySelectorAll("h1, h2") ?? []);
      return {
        canonicalUrl:
          document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
            ?.href ?? "",
        description:
          document.querySelector<HTMLMetaElement>('meta[name="description"]')
            ?.content ?? "",
        fallbackHeading:
          headings
            .map((heading) => heading.textContent?.trim() ?? "")
            .find((text) => fallbackHeadings.includes(text)) ?? null,
        rootInnerHtml: root?.innerHTML ?? "",
        title: document.title,
      };
    }, ERROR_FALLBACK_HEADINGS);

    // Patch the original HTML with route-specific meta, then content. The
    // head is patched first so tags rendered inside #root (an SVG <title>,
    // for instance) cannot be counted as patch targets.
    const { canonicalUrl, description, title } = extracted;
    const { failures, html } = applyPatches(originalHtml, [
      {
        label: "<title>",
        pattern: /<title>[^<]*<\/title>/g,
        replace: () => `<title>${title}</title>`,
      },
      attributePatch("meta", 'name="title"', "content", title),
      attributePatch("meta", 'name="description"', "content", description),
      attributePatch("link", 'rel="canonical"', "href", canonicalUrl),
      attributePatch("meta", 'property="og:title"', "content", title),
      attributePatch(
        "meta",
        'property="og:description"',
        "content",
        description
      ),
      attributePatch("meta", 'property="og:url"', "content", canonicalUrl),
      attributePatch("meta", 'name="twitter:title"', "content", title),
      attributePatch(
        "meta",
        'name="twitter:description"',
        "content",
        description
      ),
      attributePatch("meta", 'name="twitter:url"', "content", canonicalUrl),
      {
        label: '<div id="root">',
        pattern: /<div id="root"><\/div>/g,
        replace: () => `<div id="root">${extracted.rootInnerHtml}</div>`,
      },
    ]);

    for (const message of pageErrors) {
      failures.push(`uncaught page error: ${message}`);
    }
    if (extracted.rootInnerHtml.trim() === "") {
      failures.push("#root rendered empty");
    }
    if (extracted.fallbackHeading !== null) {
      failures.push(`error fallback rendered: "${extracted.fallbackHeading}"`);
    }
    if (failures.length > 0) {
      throw new Error(
        `Pre-render failed for ${routePath}:\n  - ${failures.join("\n  - ")}`
      );
    }

    // Write the pre-rendered HTML to the appropriate path
    if (routePath === "/") {
      writeFileSync(join(DIST_DIR, "index.html"), html);
      console.log("Pre-rendered: / -> dist/index.html");
    } else {
      const dir = join(DIST_DIR, routePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(join(dir, "index.html"), html);
      console.log(`Pre-rendered: ${routePath} -> dist${routePath}/index.html`);
    }

    await context.close();
  }

  await browser.close();
  server.httpServer?.close();
  console.log("Pre-rendering complete!");
  process.exit(0);
} catch (error) {
  try {
    await browser.close();
  } catch {
    // Best-effort cleanup — original error is re-thrown below
  }
  server.httpServer?.close();
  throw error;
}
