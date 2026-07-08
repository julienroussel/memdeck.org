import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const { ROUTES, SELECTED_STACK_LSK } = await import("../src/constants.ts");

const hasOptipng = (() => {
  try {
    execFileSync("optipng", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

const optimizePng = (filePath: string) => {
  if (!hasOptipng) {
    return;
  }
  execFileSync("optipng", ["-o7", "-quiet", filePath]);
};

const ROOT_DIR = join(import.meta.dirname, "..");
const DEFAULT_OUTPUT_DIR = join(ROOT_DIR, "public", "screenshots");
const BASE_URL = "http://localhost:5173";

interface Screenshot {
  deviceScaleFactor: number;
  height: number;
  name: string;
  outputDir?: string;
  url: string;
  width: number;
}

const SCREENSHOTS: Screenshot[] = [
  {
    deviceScaleFactor: 2,
    height: 844,
    name: "home-mobile",
    url: ROUTES.home,
    width: 390,
  },
  {
    deviceScaleFactor: 2,
    height: 844,
    name: "flashcard-mobile",
    url: ROUTES.flashcard,
    width: 390,
  },
  {
    deviceScaleFactor: 2,
    height: 800,
    name: "home-desktop",
    url: ROUTES.home,
    width: 1280,
  },
  {
    deviceScaleFactor: 2,
    height: 800,
    name: "screenshot",
    outputDir: join(ROOT_DIR, "docs"),
    url: ROUTES.flashcard,
    width: 1280,
  },
];

const browser = await chromium.launch();

for (const {
  name,
  url,
  width,
  height,
  deviceScaleFactor,
  outputDir,
} of SCREENSHOTS) {
  const context = await browser.newContext({
    deviceScaleFactor,
    viewport: { height, width },
  });

  // Seed the selected stack before any app code runs so pages render with a
  // stack active. useLocalDb JSON-parses stored values — a bare string is
  // classified as corrupt and ignored, so the seed must be JSON-encoded.
  await context.addInitScript(
    ({ key, value }: { key: string; value: string }) => {
      localStorage.setItem(key, value);
    },
    { key: SELECTED_STACK_LSK, value: JSON.stringify("mnemonica") }
  );

  const page = await context.newPage();
  await page.goto(`${BASE_URL}${url}`, { waitUntil: "networkidle" });

  // Wait for splash screen to fade
  await page.waitForFunction(() => {
    const splash = document.getElementById("splash");
    return !splash || splash.classList.contains("splash-hidden");
  });
  await page.waitForTimeout(500);

  const outputPath = join(outputDir ?? DEFAULT_OUTPUT_DIR, `${name}.png`);
  await page.screenshot({ path: outputPath });
  optimizePng(outputPath);
  console.log(`Captured ${outputPath}`);

  await context.close();
}

await browser.close();
if (!hasOptipng) {
  console.log("Tip: install optipng for smaller PNGs.");
}
console.log("Done! All screenshots captured.");
