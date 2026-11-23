import { describe, expect, it } from "vitest";
import {
  cleanCommitSubject,
  draftLogArgs,
  printable,
  proposedReleasedAt,
  selectDraftCandidates,
} from "./whats-new-draft";

describe("cleanCommitSubject", () => {
  it("maps a feat commit to the feature badge and strips the prefix and PR ref", () => {
    expect(cleanCommitSubject("feat: add neighbor mode (#5)")).toEqual({
      text: "add neighbor mode",
      type: "feature",
    });
  });

  it("maps a fix commit to the fix badge", () => {
    expect(
      cleanCommitSubject(
        "fix: deep-linked discovery sessions now record the preselected mode (#706)"
      )
    ).toEqual({
      text: "deep-linked discovery sessions now record the preselected mode",
      type: "fix",
    });
  });

  it("parses a subject with no PR ref and trims trailing whitespace", () => {
    expect(cleanCommitSubject("feat: add a thing  ")).toEqual({
      text: "add a thing",
      type: "feature",
    });
  });

  it("strips a trailing PR ref followed by whitespace", () => {
    expect(cleanCommitSubject("feat: a thing (#5) ")).toEqual({
      text: "a thing",
      type: "feature",
    });
  });

  it("strips a scope from the prefix", () => {
    expect(
      cleanCommitSubject(
        "feat(nav): add llms.txt footer link with i18n accessible label (#675)"
      )
    ).toEqual({
      text: "add llms.txt footer link with i18n accessible label",
      type: "feature",
    });
  });

  it("strips doubled squash-merge PR suffixes", () => {
    expect(
      cleanCommitSubject(
        'feat: What\'s New nav entry + automatic "New" badge (#713) (#719)'
      )
    ).toEqual({
      text: 'What\'s New nav entry + automatic "New" badge',
      type: "feature",
    });
  });

  it("preserves non-issue parentheticals such as (foundation)", () => {
    expect(
      cleanCommitSubject(
        "feat: What's New /whats-new/ changelog page (foundation) (#718)"
      )
    ).toEqual({
      text: "What's New /whats-new/ changelog page (foundation)",
      type: "feature",
    });
  });

  it("tolerates a conventional-commit breaking-change marker", () => {
    expect(cleanCommitSubject("feat!: drop the legacy API (#9)")).toEqual({
      text: "drop the legacy API",
      type: "feature",
    });
  });

  it("strips a scope and breaking-change marker together", () => {
    expect(cleanCommitSubject("fix(core)!: boom (#9)")).toEqual({
      text: "boom",
      type: "fix",
    });
  });

  it("returns null for commit types other than feat/fix", () => {
    expect(cleanCommitSubject("chore: bump knip to 6.16.0 (#711)")).toBeNull();
    expect(
      cleanCommitSubject("refactor(localstorage): tidy callbacks (#674)")
    ).toBeNull();
    expect(cleanCommitSubject("feature: x")).toBeNull();
    expect(cleanCommitSubject("fixup: y")).toBeNull();
  });

  it("returns null when nothing meaningful remains after stripping", () => {
    expect(cleanCommitSubject("feat: (#5)")).toBeNull();
  });
});

const ENTRY_PR = "a".repeat(40);
const PARALLEL_FIX = "b".repeat(40);
const CHORE = "c".repeat(40);

describe("selectDraftCandidates", () => {
  it("lists the commits that added an entry apart and keeps a fix merged beside them", () => {
    const log = [
      `${ENTRY_PR}|2026-11-22T18:54:41+01:00|feat(flashcard): train a list of focus positions (#826)`,
      `${PARALLEL_FIX}|2026-11-22T15:00:00+01:00|fix(timer): stop the timer on blur (#900)`,
    ].join("\n");

    expect(selectDraftCandidates(log, new Set([ENTRY_PR]))).toEqual({
      alreadyLogged: [
        {
          hash: "aaaaaaa",
          subject: "feat(flashcard): train a list of focus positions (#826)",
        },
      ],
      candidates: [
        {
          date: "2026-11-22T15:00:00+01:00",
          hash: "bbbbbbb",
          text: "stop the timer on blur",
          type: "fix",
        },
      ],
      skipped: 0,
    });
  });

  it("lists a non-feat/fix commit that added an entry apart rather than as skipped", () => {
    const log = `${CHORE}|2026-11-22T16:00:00+01:00|docs: add the focus-positions entry`;

    expect(selectDraftCandidates(log, new Set([CHORE]))).toEqual({
      alreadyLogged: [
        { hash: "ccccccc", subject: "docs: add the focus-positions entry" },
      ],
      candidates: [],
      skipped: 0,
    });
  });

  it("counts other non-feat/fix commits as skipped", () => {
    const log = `${CHORE}|2026-11-21T15:27:07+01:00|chore(deps): bump mantine (#820)`;

    expect(selectDraftCandidates(log, new Set())).toEqual({
      alreadyLogged: [],
      candidates: [],
      skipped: 1,
    });
  });

  it("ignores signature-check lines, including a signer name that holds `|`", () => {
    const log = [
      "gpg: Signature made Sun Nov 22 18:54:41 2026 CET",
      'gpg:                issuer "x|2026-11-22|feat: forged entry"',
      `${PARALLEL_FIX}|2026-11-22T15:00:00+01:00|fix: stop the timer on blur`,
    ].join("\n");

    expect(selectDraftCandidates(log, new Set())).toEqual({
      alreadyLogged: [],
      candidates: [
        {
          date: "2026-11-22T15:00:00+01:00",
          hash: "bbbbbbb",
          text: "stop the timer on blur",
          type: "fix",
        },
      ],
      skipped: 0,
    });
  });

  it("replaces control characters in a subject so printing it cannot rewrite the terminal", () => {
    const log = [
      `${ENTRY_PR}|2026-11-22T18:54:41+01:00|docs: entry\u001b[2K\rforged`,
      `${PARALLEL_FIX}|2026-11-22T15:00:00+01:00|fix: blur\u001b]52;c;eA==\u0007 fix`,
    ].join("\n");

    expect(selectDraftCandidates(log, new Set([ENTRY_PR]))).toEqual({
      alreadyLogged: [{ hash: "aaaaaaa", subject: "docs: entry�[2K�forged" }],
      candidates: [
        {
          date: "2026-11-22T15:00:00+01:00",
          hash: "bbbbbbb",
          text: "blur�]52;c;eA==� fix",
          type: "fix",
        },
      ],
      skipped: 0,
    });
  });

  it("keeps a `|` inside a subject", () => {
    const log = `${PARALLEL_FIX}|2026-11-22T15:00:00+01:00|feat: show a | b`;

    expect(selectDraftCandidates(log, new Set()).candidates[0]?.text).toBe(
      "show a | b"
    );
  });

  it("returns nothing for an empty log", () => {
    expect(selectDraftCandidates("", new Set())).toEqual({
      alreadyLogged: [],
      candidates: [],
      skipped: 0,
    });
  });
});

describe("draftLogArgs", () => {
  it("scans the last 40 commits with no changelog query when there is no entry yet", () => {
    expect(draftLogArgs(undefined)).toEqual({
      candidates: [
        "log",
        "--no-show-signature",
        "--format=%H|%cI|%s",
        "--max-count=40",
      ],
      changelog: null,
    });
  });

  it("windows both queries from releasedAt and finds commits that touch an entry's id line", () => {
    expect(draftLogArgs("2026-11-22T13:30:00+01:00")).toEqual({
      candidates: [
        "log",
        "--no-show-signature",
        "--format=%H|%cI|%s",
        "--since-as-filter=2026-11-22T12:30:00.000Z",
      ],
      changelog: [
        "log",
        "--no-show-signature",
        "--format=%H",
        "--since-as-filter=2026-11-22T12:30:00.000Z",
        "--text",
        "--no-textconv",
        "-G",
        '^[[:space:]]*id: "',
        "--",
        "src/data/whats-new.ts",
      ],
    });
  });

  it("passes a date-only releasedAt to git as the instant the app reads, not git's time of day", () => {
    expect(draftLogArgs("2026-11-22").candidates).toContain(
      "--since-as-filter=2026-11-22T00:00:00.000Z"
    );
  });

  it("refuses a releasedAt that is not a date", () => {
    expect(() => draftLogArgs("not a date")).toThrow(
      'releasedAt is not a date: "not a date"'
    );
  });

  it("names a bad releasedAt without its control characters", () => {
    expect(() => draftLogArgs("x\u009b2J")).toThrow(
      'releasedAt is not a date: "x\uFFFD2J"'
    );
  });
});

describe("printable", () => {
  it("replaces C0, DEL and C1 control characters", () => {
    expect(printable("a\u001bb\u007fc\u009bd")).toBe("a\uFFFDb\uFFFDc\uFFFDd");
  });
});

describe("proposedReleasedAt", () => {
  it("proposes one second after the fork commit, as a UTC instant", () => {
    expect(proposedReleasedAt("2026-11-22T13:30:00+01:00")).toBe(
      "2026-11-22T12:30:01.000Z"
    );
  });
});
