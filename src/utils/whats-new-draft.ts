import type { WhatsNewType } from "../data/whats-new";

// `feat`/`fix` with optional `(scope)` and `!`, then `:` and any following space.
const PREFIX_RE = /^(?<type>feat|fix)(?:\([^)]*\))?!?:\s*/u;
// One or more trailing ` (#NNN)` issue/PR refs (incl. doubled squash suffixes like `(#713) (#719)`).
const TRAILING_REFS_RE = /(?:\s*\(#\d+\))+\s*$/u;
// A full object name: SHA-1 (40 hex) or SHA-256 (64 hex).
const OBJECT_NAME_RE = /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/u;
// Control characters, which a commit subject can carry and a terminal would act on.
const CONTROL_CHARS_RE = /\p{Cc}/gu;

/** Replaces control characters with U+FFFD, so printing the text cannot rewrite the terminal. */
export const printable = (text: string): string =>
  text.replace(CONTROL_CHARS_RE, "\uFFFD");

type DraftSubject = { type: Exclude<WhatsNewType, "stack">; text: string };

/**
 * Parses a conventional-commit subject into a draft "What's New" candidate. Strips the
 * `feat`/`fix` prefix (with optional scope and `!`) plus any trailing `(#NNN)` issue/PR refs,
 * then maps the kind to a `WhatsNewType` badge. Returns `null` for any other commit type, or
 * when nothing meaningful remains after stripping. The output is a raw candidate — clean,
 * translated prose is still composed by hand (entries are decoupled from commits).
 */
export const cleanCommitSubject = (subject: string): DraftSubject | null => {
  const match = subject.match(PREFIX_RE);
  if (!match) {
    return null;
  }
  const type = match.groups?.type === "feat" ? "feature" : "fix";
  const text = subject
    .slice(match[0].length)
    .replace(TRAILING_REFS_RE, "")
    .trim();
  if (!text) {
    return null;
  }
  return { text, type };
};

type DraftCandidate = DraftSubject & { hash: string; date: string };

type LoggedCommit = { hash: string; subject: string };

/**
 * Picks the draft candidates from `git log --format=%H|%cI|%s` output. Commits in
 * `changelogCommits` are taken to have their entry, so they are returned in `alreadyLogged`
 * for the author to check rather than offered again. Other non-feat/fix commits are counted in
 * `skipped`. A line that does not start with a full commit hash is ignored: `log.showSignature`
 * prints the signature check on stdout, and its signer text can hold `|`. Control characters
 * in a subject are replaced with U+FFFD, so printing it cannot rewrite the terminal.
 */
export const selectDraftCandidates = (
  log: string,
  changelogCommits: ReadonlySet<string>
): {
  candidates: DraftCandidate[];
  alreadyLogged: LoggedCommit[];
  skipped: number;
} => {
  const candidates: DraftCandidate[] = [];
  const alreadyLogged: LoggedCommit[] = [];
  let skipped = 0;
  for (const line of log ? log.split("\n") : []) {
    // %H and %cI never contain `|`; rejoin the rest so a `|` in a subject can't corrupt the parse.
    const [hash, date, ...rest] = line.split("|");
    if (
      hash === undefined ||
      !OBJECT_NAME_RE.test(hash) ||
      date === undefined ||
      rest.length === 0
    ) {
      continue;
    }
    const subject = printable(rest.join("|"));
    if (changelogCommits.has(hash)) {
      alreadyLogged.push({ hash: hash.slice(0, 7), subject });
      continue;
    }
    const parsed = cleanCommitSubject(subject);
    if (!parsed) {
      skipped += 1;
      continue;
    }
    candidates.push({ date, hash: hash.slice(0, 7), ...parsed });
  }
  return { alreadyLogged, candidates, skipped };
};

const CHANGELOG_PATH = "src/data/whats-new.ts";
// An entry's `id: "<slug>",` line, as a POSIX regex for `git log -G`.
const ENTRY_ID_LINE = '^[[:space:]]*id: "';

/**
 * The `git log` arguments a draft runs: `candidates` for `selectDraftCandidates`' log, and
 * `changelog` for the commits that add, move or remove an entry's `id:` line (`null` with no
 * entry yet, when the draft scans the last 40 commits instead). Both cover the commits since the
 * newest entry's `releasedAt`, passed to git as the instant `Date.parse` reads: git's own date
 * parser reads a date-only value at the current time of day. `--since-as-filter` checks every
 * commit's date, where `--since` stops at the first older one. `--text --no-textconv` stop git
 * from skipping the changelog as binary or running a textconv filter on it. Throws when
 * `releasedAt` is not a date.
 */
export const draftLogArgs = (
  releasedAt: string | undefined
): { candidates: string[]; changelog: string[] | null } => {
  const base = ["log", "--no-show-signature"];
  if (releasedAt === undefined) {
    return {
      candidates: [...base, "--format=%H|%cI|%s", "--max-count=40"],
      changelog: null,
    };
  }
  const since = Date.parse(releasedAt);
  if (Number.isNaN(since)) {
    throw new Error(
      `releasedAt is not a date: ${printable(JSON.stringify(releasedAt))}`
    );
  }
  const logWindow = `--since-as-filter=${new Date(since).toISOString()}`;
  return {
    candidates: [...base, "--format=%H|%cI|%s", logWindow],
    changelog: [
      ...base,
      "--format=%H",
      logWindow,
      "--text",
      "--no-textconv",
      "-G",
      ENTRY_ID_LINE,
      "--",
      CHANGELOG_PATH,
    ],
  };
};

/**
 * The `releasedAt` a draft proposes: one second after the commit date of the branch's fork
 * from the default branch. Every commit the draft offered from the default branch is dated at
 * or before the fork, so the next draft's window starts after them; a PR merged to the default
 * branch after the fork is dated later and stays in it; and the entry's own PR, merged later
 * still, is caught by its `id:` line. The same field is the date shown to readers, so it reads
 * as the fork date; moving it later hides the PRs merged in between from the next draft.
 */
export const proposedReleasedAt = (forkCommitDate: string): string =>
  new Date(Date.parse(forkCommitDate) + 1000).toISOString();
