import type { WhatsNewType } from "../data/whats-new";

// `feat`/`fix` with optional `(scope)` and `!`, then `:` and any following space.
const PREFIX_RE = /^(feat|fix)(?:\([^)]*\))?!?:\s*/;
// One or more trailing ` (#NNN)` issue/PR refs (incl. doubled squash suffixes like `(#713) (#719)`).
const TRAILING_REFS_RE = /(?:\s*\(#\d+\))+\s*$/;

/**
 * Parses a conventional-commit subject into a draft "What's New" candidate. Strips the
 * `feat`/`fix` prefix (with optional scope and `!`) plus any trailing `(#NNN)` issue/PR refs,
 * then maps the kind to a `WhatsNewType` badge. Returns `null` for any other commit type, or
 * when nothing meaningful remains after stripping. The output is a raw candidate — clean,
 * translated prose is still composed by hand (entries are decoupled from commits).
 */
export const cleanCommitSubject = (
  subject: string
): { type: Exclude<WhatsNewType, "stack">; text: string } | null => {
  const match = subject.match(PREFIX_RE);
  if (!match) {
    return null;
  }
  const type = match[1] === "feat" ? "feature" : "fix";
  const text = subject
    .slice(match[0].length)
    .replace(TRAILING_REFS_RE, "")
    .trim();
  if (!text) {
    return null;
  }
  return { text, type };
};
