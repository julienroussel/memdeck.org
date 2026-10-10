import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { AppRoute } from "../src/constants.ts";

const { ROUTES, SITE_URL } = await import("../src/constants.ts");

const DIST_DIR = join(import.meta.dirname, "..", "dist");

/** Priority assigned to each route for sitemap ordering. */
const ROUTE_PRIORITIES: Record<AppRoute, string> = {
  "/": "1.0",
  "/about/": "0.3",
  "/acaan/": "0.7",
  "/distance/": "0.7",
  "/faq/": "0.7",
  "/flashcard/": "0.9",
  "/guide/": "0.8",
  "/resources/": "0.8",
  "/spot-check/": "0.7",
  "/stats/": "0.3",
  "/toolbox/": "0.5",
  "/whats-new/": "0.6",
};

/**
 * Returns the last git commit date (YYYY-MM-DD) that touched any file
 * related to a given route path. Falls back to today's date.
 */
const getLastModified = (routePath: AppRoute): string => {
  const sourceMap: Record<AppRoute, string> = {
    "/": "src/pages/home",
    "/about/": "src/pages/about.tsx",
    "/acaan/": "src/pages/acaan",
    "/distance/": "src/pages/distance",
    "/faq/": "src/pages/faq.tsx",
    "/flashcard/": "src/pages/flashcard",
    "/guide/": "src/pages/guide",
    "/resources/": "src/pages/resources.tsx",
    "/spot-check/": "src/pages/spot-check",
    "/stats/": "src/pages/stats",
    "/toolbox/": "src/pages/toolbox",
    "/whats-new/": "src/data/whats-new.ts",
  };

  const source = sourceMap[routePath];

  try {
    const date = execFileSync(
      "git",
      ["log", "-1", "--format=%cs", "--", source],
      {
        encoding: "utf-8",
      }
    ).trim();
    if (date) {
      return date;
    }
    // Warn rather than fail: a new route built before its first commit has
    // no history yet, and the build should still pass locally.
    process.stderr.write(
      `[generate-sitemap] git log found no commit for route "${routePath}" (source "${source}"), using today's date\n`
    );
    return new Date().toISOString().slice(0, 10);
  } catch (error) {
    // Don't fail the build — sitemap should still publish — but make the
    // failure noisy so a silently-stuck "today's date" lastmod across many
    // routes can be diagnosed instead of mistaken for a quiet build.
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(
      `[generate-sitemap] git log failed for route "${routePath}" (source "${source}"): ${message}\n`
    );
    return new Date().toISOString().slice(0, 10);
  }
};

// A shallow clone makes git log report HEAD's date for every path, so every
// <lastmod> would silently become the build date. Fail instead of warning:
// the deployed sitemap is built in CI, where a warning goes unread.
const isShallowRepository = (): boolean => {
  try {
    return (
      execFileSync("git", ["rev-parse", "--is-shallow-repository"], {
        encoding: "utf-8",
      }).trim() === "true"
    );
  } catch {
    // Not a git checkout: getLastModified's catch already reports each route.
    return false;
  }
};

if (isShallowRepository()) {
  process.stderr.write(
    "[generate-sitemap] shallow git clone: per-route <lastmod> dates would all be HEAD's. Run `git fetch --unshallow`, or check out with fetch-depth: 0.\n"
  );
  process.exit(1);
}

const routePaths = Object.values(ROUTES);

const urls = routePaths.map((routePath) => {
  const lastmod = getLastModified(routePath);
  const priority = ROUTE_PRIORITIES[routePath];

  return `  <url>
    <loc>${SITE_URL}${routePath}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${priority}</priority>
  </url>`;
});

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;

writeFileSync(join(DIST_DIR, "sitemap.xml"), sitemap);
console.log(`Sitemap generated with ${urls.length} URLs`);
