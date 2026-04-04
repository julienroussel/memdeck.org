import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const { ROUTES, SITE_URL } = await import("../src/constants.ts");

const DIST_DIR = join(import.meta.dirname, "..", "dist");

/** Route path literal type derived from the ROUTES constant. */
type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];

/** Priority assigned to each route for sitemap ordering. */
const ROUTE_PRIORITIES: Record<RoutePath, string> = {
  "/": "1.0",
  "/flashcard/": "0.9",
  "/guide/": "0.8",
  "/resources/": "0.8",
  "/faq/": "0.7",
  "/spot-check/": "0.7",
  "/acaan/": "0.7",
  "/toolbox/": "0.5",
  "/stats/": "0.3",
  "/about/": "0.3",
};

/**
 * Returns the last git commit date (YYYY-MM-DD) that touched any file
 * related to a given route path. Falls back to today's date.
 */
const getLastModified = (routePath: RoutePath): string => {
  const sourceMap: Record<RoutePath, string> = {
    "/": "src/pages/home",
    "/flashcard/": "src/pages/flashcard",
    "/guide/": "src/pages/guide",
    "/resources/": "src/pages/resources.tsx",
    "/faq/": "src/pages/faq.tsx",
    "/spot-check/": "src/pages/spot-check",
    "/acaan/": "src/pages/acaan",
    "/toolbox/": "src/pages/toolbox",
    "/stats/": "src/pages/stats",
    "/about/": "src/pages/about.tsx",
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
    return date || new Date().toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
};

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
