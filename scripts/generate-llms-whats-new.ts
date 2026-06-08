import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const { WHATS_NEW_ENTRIES } = await import("../src/data/whats-new.ts");
const { renderWhatsNewForLlms } = await import(
  "../src/utils/render-whats-new-llms.ts"
);

/** How many of the most-recent entries to publish into llms-full.txt. */
const LIMIT = 10;
const START = "<!-- whats-new:start -->";
const END = "<!-- whats-new:end -->";

// Vite copies public/llms-full.txt into dist/ during `vite build`, so this runs
// after that step. The injected block lives in dist only — public/ keeps a
// placeholder so `src/data/whats-new.ts` stays the single source of truth.
const FILE = join(import.meta.dirname, "..", "dist", "llms-full.txt");

const original = readFileSync(FILE, "utf-8");
const startIdx = original.indexOf(START);
const endIdx = original.indexOf(END);

if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
  // Fail loudly: a missing/misordered marker means the section silently stopped
  // updating. Better to break the build than to publish a stale changelog.
  process.stderr.write(
    "[generate-llms-whats-new] whats-new markers not found in dist/llms-full.txt\n"
  );
  process.exit(1);
}

const block = renderWhatsNewForLlms(WHATS_NEW_ENTRIES, LIMIT);

if (!block) {
  // Same class of problem as a missing marker: don't silently publish an empty
  // Recent Updates section. Unreachable today (entries are curated), but keeps
  // the fail-loud contract complete if the changelog is ever emptied.
  process.stderr.write(
    "[generate-llms-whats-new] rendered block is empty — refusing to publish\n"
  );
  process.exit(1);
}

const updated = `${original.slice(0, startIdx + START.length)}\n${block}\n${original.slice(endIdx)}`;

writeFileSync(FILE, updated);
console.log(
  `llms-full.txt: injected ${Math.min(LIMIT, WHATS_NEW_ENTRIES.length)} recent What's New entries`
);
