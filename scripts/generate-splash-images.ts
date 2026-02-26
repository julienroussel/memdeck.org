import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

interface Device {
  h: number;
  w: number;
}

interface Theme {
  background: { r: number; g: number; b: number };
  logo: string;
  name: string;
}

const PUBLIC_DIR = join(import.meta.dirname, "..", "public");
const OUTPUT_DIR = join(PUBLIC_DIR, "splash");

const DEVICES: Device[] = [
  { w: 640, h: 1136 },
  { w: 750, h: 1334 },
  { w: 1125, h: 2436 },
  { w: 828, h: 1792 },
  { w: 1242, h: 2688 },
  { w: 1170, h: 2532 },
  { w: 1284, h: 2778 },
  { w: 1179, h: 2556 },
  { w: 1290, h: 2796 },
];

const THEMES: Theme[] = [
  {
    name: "light",
    background: { r: 255, g: 255, b: 255 },
    logo: "memdeck-logo-white.webp",
  },
  {
    name: "dark",
    background: { r: 17, g: 17, b: 17 },
    logo: "memdeck-logo-black.webp",
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
    const logoWidth = Math.round(device.w * LOGO_WIDTH_RATIO);
    const logoHeight = Math.round(logoWidth / logoAspect);

    const resizedLogo = await sharp(logoBuffer)
      .resize(logoWidth, logoHeight, { fit: "inside" })
      .flatten({ background: theme.background })
      .png()
      .toBuffer();

    const left = Math.round((device.w - logoWidth) / 2);
    const top = Math.round((device.h - logoHeight) / 2);

    const outputPath = join(
      OUTPUT_DIR,
      `splash-${device.w}x${device.h}-${theme.name}.png`
    );

    await sharp({
      create: {
        width: device.w,
        height: device.h,
        channels: 3,
        background: theme.background,
      },
    })
      .composite([{ input: resizedLogo, left, top }])
      .png()
      .toFile(outputPath);

    console.log(`Generated ${outputPath}`);
  }
}

console.log("Done! Generated all splash images.");
