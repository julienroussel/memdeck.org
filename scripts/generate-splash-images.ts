import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

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

interface Device {
  h: number;
  /** Also emit a rotated h×w image — iPad PWAs can launch in landscape. */
  landscape: boolean;
  w: number;
}

interface Theme {
  background: { r: number; g: number; b: number };
  logo: string;
  name: string;
}

const PUBLIC_DIR = join(import.meta.dirname, "..", "public");
const OUTPUT_DIR = join(PUBLIC_DIR, "splash");

// Portrait pixel sizes. Every entry needs a matching light + dark pair of
// apple-touch-startup-image tags in index.html (two pairs when `landscape`
// is true) — keep the two files in lockstep.
const DEVICES: Device[] = [
  // iPhones (portrait only — standalone iPhone web apps launch in portrait).
  { h: 1136, landscape: false, w: 640 }, // iPhone 5 / 5s / SE 1 (320×568 @2x)
  { h: 1334, landscape: false, w: 750 }, // iPhone 6–8 / SE 2–3 (375×667 @2x)
  { h: 2436, landscape: false, w: 1125 }, // iPhone X / XS / 11 Pro / 12–13 mini (375×812 @3x)
  { h: 1792, landscape: false, w: 828 }, // iPhone XR / 11 (414×896 @2x)
  { h: 2688, landscape: false, w: 1242 }, // iPhone XS Max / 11 Pro Max (414×896 @3x)
  { h: 2532, landscape: false, w: 1170 }, // iPhone 12–14 / 16e / 17e (390×844 @3x)
  { h: 2778, landscape: false, w: 1284 }, // iPhone 12–13 Pro Max / 14 Plus (428×926 @3x)
  { h: 2556, landscape: false, w: 1179 }, // iPhone 14 Pro / 15 / 16 (393×852 @3x)
  { h: 2796, landscape: false, w: 1290 }, // iPhone 14 Pro Max / 15–16 Plus (430×932 @3x)
  { h: 2622, landscape: false, w: 1206 }, // iPhone 16 Pro / 17 / 17 Pro (402×874 @3x)
  { h: 2868, landscape: false, w: 1320 }, // iPhone 16 Pro Max / 17 Pro Max (440×956 @3x)
  { h: 2736, landscape: false, w: 1260 }, // iPhone Air (420×912 @3x)
  // iPads (portrait + landscape, all @2x).
  { h: 2752, landscape: true, w: 2064 }, // iPad Pro 13″ M4–M5 (1032×1376)
  { h: 2420, landscape: true, w: 1668 }, // iPad Pro 11″ M4–M5 (834×1210)
  { h: 2732, landscape: true, w: 2048 }, // iPad Pro 12.9″ / iPad Air 13″ (1024×1366)
  { h: 2388, landscape: true, w: 1668 }, // iPad Pro 11″ gen 1–4 (834×1194)
  { h: 2360, landscape: true, w: 1640 }, // iPad Air 10.9–11″ / iPad gen 10–11 (820×1180)
  { h: 2160, landscape: true, w: 1620 }, // iPad 10.2″ gen 7–9 (810×1080)
  { h: 2266, landscape: true, w: 1488 }, // iPad mini 6–7 (744×1133)
];

const THEMES: Theme[] = [
  {
    background: { b: 255, g: 255, r: 255 },
    logo: "memdeck-logo-white.webp",
    name: "light",
  },
  {
    background: { b: 17, g: 17, r: 17 },
    logo: "memdeck-logo-black.webp",
    name: "dark",
  },
];

const LOGO_WIDTH_RATIO = 0.55;

for (const theme of THEMES) {
  const logoPath = join(PUBLIC_DIR, theme.logo);
  const logoBuffer = await readFile(logoPath);
  const logoMeta = await sharp(logoBuffer).metadata();

  if (!(logoMeta.width && logoMeta.height)) {
    throw new Error(`Could not read metadata for ${theme.logo}`);
  }

  const logoAspect = logoMeta.width / logoMeta.height;

  for (const device of DEVICES) {
    // Size the logo off the short edge so it keeps the same visual scale in
    // portrait and landscape renders of the same device.
    const logoWidth = Math.round(
      Math.min(device.w, device.h) * LOGO_WIDTH_RATIO
    );
    const logoHeight = Math.round(logoWidth / logoAspect);

    const resizedLogo = await sharp(logoBuffer)
      .resize(logoWidth, logoHeight, { fit: "inside" })
      .flatten({ background: theme.background })
      .png()
      .toBuffer();

    const targets = device.landscape
      ? [
          { height: device.h, width: device.w },
          { height: device.w, width: device.h },
        ]
      : [{ height: device.h, width: device.w }];

    for (const { width, height } of targets) {
      const left = Math.round((width - logoWidth) / 2);
      const top = Math.round((height - logoHeight) / 2);

      const outputPath = join(
        OUTPUT_DIR,
        `splash-${width}x${height}-${theme.name}.png`
      );

      await sharp({
        create: {
          background: theme.background,
          channels: 3,
          height,
          width,
        },
      })
        .composite([{ input: resizedLogo, left, top }])
        .png()
        .toFile(outputPath);

      optimizePng(outputPath);
      console.log(`Generated ${outputPath}`);
    }
  }
}

if (!hasOptipng) {
  console.log("Tip: install optipng for smaller PNGs.");
}
console.log("Done! Generated all splash images.");
