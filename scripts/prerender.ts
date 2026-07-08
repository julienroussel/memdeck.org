import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const DIST_DIR = join(import.meta.dirname, "..", "dist");
const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}`;
const TIMEOUT = 10_000;

const { ROUTES, SELECTED_STACK_LSK } = await import("../src/constants.ts");
const routePaths = Object.values(ROUTES);

// Read the original built index.html once before any modifications
const originalHtml = readFileSync(join(DIST_DIR, "index.html"), "utf-8");

// Start Vite's preview server to serve the production build
const { preview } = await import("vite");
const server = await preview({ preview: { port: PORT, strictPort: true } });

const browser = await chromium.launch();

try {
  for (const routePath of routePaths) {
    // Fresh context per route so localStorage writes from one prerendered
    // page can't leak into the next.
    const context = await browser.newContext();

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
    const extracted = await page.evaluate(() => {
      const root = document.getElementById("root");
      return {
        canonicalUrl:
          document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
            ?.href ?? "",
        description:
          document.querySelector<HTMLMetaElement>('meta[name="description"]')
            ?.content ?? "",
        rootInnerHtml: root?.innerHTML ?? "",
        title: document.title,
      };
    });

    // Patch the original HTML with route-specific content and meta
    let html = originalHtml;

    // Inject pre-rendered content into #root
    html = html.replace(
      '<div id="root"></div>',
      () => `<div id="root">${extracted.rootInnerHtml}</div>`
    );

    // Update title
    html = html.replace(
      /<title>[^<]*<\/title>/,
      () => `<title>${extracted.title}</title>`
    );

    // Update meta name="title"
    html = html.replace(
      /(<meta\s+name="title"\s+content=")[^"]*(")/,
      (_: string, p1: string, p2: string) => `${p1}${extracted.title}${p2}`
    );

    // Update meta name="description"
    html = html.replace(
      /(<meta\s+name="description"\s+content=")[\s\S]*?(")/,
      (_: string, p1: string, p2: string) =>
        `${p1}${extracted.description}${p2}`
    );

    // Update canonical link
    html = html.replace(
      /(<link\s+rel="canonical"\s+href=")[^"]*(")/,
      (_: string, p1: string, p2: string) =>
        `${p1}${extracted.canonicalUrl}${p2}`
    );

    // Update OG tags
    html = html.replace(
      /(<meta\s+property="og:title"\s+content=")[^"]*(")/,
      (_: string, p1: string, p2: string) => `${p1}${extracted.title}${p2}`
    );
    html = html.replace(
      /(<meta\s+property="og:description"\s+content=")[\s\S]*?(")/,
      (_: string, p1: string, p2: string) =>
        `${p1}${extracted.description}${p2}`
    );
    html = html.replace(
      /(<meta\s+property="og:url"\s+content=")[^"]*(")/,
      (_: string, p1: string, p2: string) =>
        `${p1}${extracted.canonicalUrl}${p2}`
    );

    // Update Twitter tags
    html = html.replace(
      /(<meta\s+name="twitter:title"\s+content=")[^"]*(")/,
      (_: string, p1: string, p2: string) => `${p1}${extracted.title}${p2}`
    );
    html = html.replace(
      /(<meta\s+name="twitter:description"\s+content=")[\s\S]*?(")/,
      (_: string, p1: string, p2: string) =>
        `${p1}${extracted.description}${p2}`
    );
    html = html.replace(
      /(<meta\s+name="twitter:url"\s+content=")[^"]*(")/,
      (_: string, p1: string, p2: string) =>
        `${p1}${extracted.canonicalUrl}${p2}`
    );

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
