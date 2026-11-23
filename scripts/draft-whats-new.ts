import { execFileSync } from "node:child_process";
import { join } from "node:path";

const { WHATS_NEW_ENTRIES } = await import("../src/data/whats-new.ts");
const { draftLogArgs, proposedReleasedAt, selectDraftCandidates } =
  await import("../src/utils/whats-new-draft.ts");
const { SUPPORTED_LANGUAGES } = await import(
  "../src/i18n/supported-languages.ts"
);

// Used only when there are no entries yet, so no entry to take the title languages from.
// Derived from the canonical language set so it can't drift when a locale is added.
const FALLBACK_LANGS = [...SUPPORTED_LANGUAGES];

// git resolves the changelog pathspec against its cwd, so run it from the repo root.
const REPO_ROOT = join(import.meta.dirname, "..");

const latest = WHATS_NEW_ENTRIES.at(0); // entries are newest-first

const DEFAULT_BRANCH = "origin/main";

// `quiet` keeps git's stderr out of the output, for a call whose failure is handled.
const runGit = (args: readonly string[], quiet = false): string =>
  execFileSync("git", args, {
    cwd: REPO_ROOT,
    encoding: "utf-8",
    ...(quiet ? { stdio: ["ignore", "pipe", "pipe"] } : {}),
  }).trim();

const git = (args: readonly string[]): string => {
  try {
    return runGit(args);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(
      `[draft-whats-new] git ${args[0]} failed: ${message}\n`
    );
    process.exit(1);
  }
};

// A shallow clone shows its oldest commit as adding every file, so it would count as
// adding an entry and drop out of the draft, and older commits would be missing.
if (git(["rev-parse", "--is-shallow-repository"]) === "true") {
  process.stderr.write(
    "[draft-whats-new] shallow git clone: the draft would miss commits. Run `git fetch --unshallow`.\n"
  );
  process.exit(1);
}

const logArgs = (() => {
  try {
    return draftLogArgs(latest?.releasedAt);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`[draft-whats-new] newest entry: ${message}\n`);
    process.exit(1);
  }
})();
const raw = git(logArgs.candidates);

// An entry is written in the PR that ships it, so its `releasedAt` predates that PR's merge
// and the window holds the PR itself. A commit in the window that adds, moves or removes an
// entry's `id:` line is taken to have its entry: it is listed for the author to check instead
// of being offered again, while a fix merged beside it stays in. A commit that only edits an
// older entry's text, or the file's code, is still offered. This assumes squash merges: a
// merged branch's other commits would be offered again, as would commits on this branch that
// are dated after its fork from the default branch and not on it (a stacked branch's parent,
// unpushed commits on the default branch, or a stale remote).
const changelogCommits = new Set(
  logArgs.changelog ? git(logArgs.changelog).split("\n") : []
);

const { candidates, skipped, alreadyLogged } = selectDraftCandidates(
  raw,
  changelogCommits
);

const boundary = latest
  ? `last entry "${latest.id}" (${latest.releasedAt})`
  : "(no entries yet — scanning the last 40 commits)";

console.log(`\nWhat's New draft — candidates since ${boundary}`);
console.log(
  `${candidates.length} candidate(s), ${skipped} non-feat/fix commit(s) skipped, ${alreadyLogged.length} that add, move or remove an entry left out.\n`
);

for (const commit of alreadyLogged) {
  console.log(`  [changelog entry] ${commit.hash} ${commit.subject}`);
}
if (alreadyLogged.length > 0) {
  console.log("");
}

for (const candidate of candidates) {
  console.log(`  [${candidate.type}] ${candidate.hash} ${candidate.date}`);
  console.log(`    ${candidate.text}\n`);
}

// See `proposedReleasedAt`. Without the default branch to fork from, it falls back to the
// drafting time and says so, since PRs merged after the fork would then be missed.
const skeletonReleasedAt = (): string => {
  try {
    const fork = runGit(["merge-base", "HEAD", DEFAULT_BRANCH], true);
    return proposedReleasedAt(
      runGit(["log", "-1", "--no-show-signature", "--format=%cI", fork], true)
    );
  } catch {
    process.stderr.write(
      `[draft-whats-new] no merge base with ${DEFAULT_BRANCH}: releasedAt is the drafting time, so a PR merged to it since this branch forked would be missed. Fetch it and re-run.\n`
    );
    return new Date().toISOString();
  }
};

const top = candidates.at(0);
if (top) {
  const langs = latest ? Object.keys(latest.title) : FALLBACK_LANGS;
  const titleLines = langs
    .map(
      (lang) =>
        `    ${lang}: ${lang === "en" ? JSON.stringify(top.text) : '"TODO"'},`
    )
    .join("\n");
  // Before the block, so a fallback warning is not pasted with it.
  const releasedAt = skeletonReleasedAt();
  console.log(
    "Paste-ready skeleton — compose/squash by hand, then translate the TODOs.\nreleasedAt starts the next draft's window: moving it later hides PRs merged since this branch forked.\n"
  );
  console.log("{");
  console.log('  id: "TODO-slug",');
  console.log(`  releasedAt: ${JSON.stringify(releasedAt)},`);
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
