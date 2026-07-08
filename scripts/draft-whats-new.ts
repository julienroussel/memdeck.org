import { execFileSync } from "node:child_process";

const { WHATS_NEW_ENTRIES } = await import("../src/data/whats-new.ts");
const { cleanCommitSubject } = await import("../src/utils/whats-new-draft.ts");
const { SUPPORTED_LANGUAGES } = await import(
  "../src/i18n/supported-languages.ts"
);

// Used only when there are no entries yet (no `releasedAt` boundary to derive keys from).
// Derived from the canonical language set so it can't drift when a locale is added.
const FALLBACK_LANGS = [...SUPPORTED_LANGUAGES];

const latest = WHATS_NEW_ENTRIES.at(0); // entries are newest-first

const gitArgs = ["log", "--format=%H|%cI|%s"];
gitArgs.push(latest ? `--since=${latest.releasedAt}` : "--max-count=40");

let raw = "";
try {
  raw = execFileSync("git", gitArgs, { encoding: "utf-8" }).trim();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[draft-whats-new] git log failed: ${message}\n`);
  process.exit(1);
}

type Candidate = {
  hash: string;
  date: string;
  type: "feature" | "fix";
  text: string;
};

const candidates: Candidate[] = [];
let skipped = 0;
for (const line of raw ? raw.split("\n") : []) {
  // %H and %cI never contain `|`; rejoin the rest so a `|` in a subject can't corrupt the parse.
  const [hash, date, ...rest] = line.split("|");
  if (hash === undefined || date === undefined || rest.length === 0) {
    continue;
  }
  const parsed = cleanCommitSubject(rest.join("|"));
  if (!parsed) {
    skipped += 1;
    continue;
  }
  candidates.push({ date, hash: hash.slice(0, 7), ...parsed });
}

const boundary = latest
  ? `last entry "${latest.id}" (${latest.releasedAt})`
  : "(no entries yet — scanning the last 40 commits)";

console.log(`\nWhat's New draft — candidates since ${boundary}`);
console.log(
  `${candidates.length} candidate(s), ${skipped} non-feat/fix commit(s) skipped.\n`
);

for (const candidate of candidates) {
  console.log(`  [${candidate.type}] ${candidate.hash} ${candidate.date}`);
  console.log(`    ${candidate.text}\n`);
}

const top = candidates.at(0);
if (top) {
  const langs = latest ? Object.keys(latest.title) : FALLBACK_LANGS;
  const titleLines = langs
    .map(
      (lang) =>
        `    ${lang}: ${lang === "en" ? JSON.stringify(top.text) : '"TODO"'},`
    )
    .join("\n");
  console.log(
    "Paste-ready skeleton — compose/squash by hand, then translate the TODOs:\n"
  );
  console.log("{");
  console.log('  id: "TODO-slug",');
  console.log(`  releasedAt: ${JSON.stringify(top.date)},`);
  console.log(`  type: ${JSON.stringify(top.type)},`);
  console.log("  title: {");
  console.log(titleLines);
  console.log("  },");
  console.log("},\n");
} else {
  console.log(
    "No feat/fix candidates since the last entry. Nothing to draft.\n"
  );
}
