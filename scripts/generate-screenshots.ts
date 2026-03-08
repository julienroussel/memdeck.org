import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { chromium } from "@playwright/test";

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
    name: "home-mobile",
    url: "/",
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
  },
  {
    name: "flashcard-mobile",
    url: "/flashcard",
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
  },
  {
    name: "home-desktop",
    url: "/",
    width: 1280,
    height: 800,
    deviceScaleFactor: 2,
  },
  {
    name: "screenshot",
    url: "/flashcard",
    width: 1280,
    height: 800,
    deviceScaleFactor: 2,
    outputDir: join(ROOT_DIR, "docs"),
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
    viewport: { width, height },
    deviceScaleFactor,
  });
  const page = await context.newPage();

  // Set a stack in localStorage so training pages render
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    localStorage.setItem("memdeck-app-stack", "mnemonica");
  });

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
