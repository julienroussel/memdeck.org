import { describe, expect, it } from "vitest";
import { cleanCommitSubject } from "./whats-new-draft";

describe("cleanCommitSubject", () => {
  it("maps a feat commit to the feature badge and strips the prefix and PR ref", () => {
    expect(cleanCommitSubject("feat: add neighbor mode (#5)")).toEqual({
      type: "feature",
      text: "add neighbor mode",
    });
  });

  it("maps a fix commit to the fix badge", () => {
    expect(
      cleanCommitSubject(
        "fix: deep-linked discovery sessions now record the preselected mode (#706)"
      )
    ).toEqual({
      type: "fix",
      text: "deep-linked discovery sessions now record the preselected mode",
    });
  });

  it("parses a subject with no PR ref and trims trailing whitespace", () => {
    expect(cleanCommitSubject("feat: add a thing  ")).toEqual({
      type: "feature",
      text: "add a thing",
    });
  });

  it("strips a trailing PR ref followed by whitespace", () => {
    expect(cleanCommitSubject("feat: a thing (#5) ")).toEqual({
      type: "feature",
      text: "a thing",
    });
  });

  it("strips a scope from the prefix", () => {
    expect(
      cleanCommitSubject(
        "feat(nav): add llms.txt footer link with i18n accessible label (#675)"
      )
    ).toEqual({
      type: "feature",
      text: "add llms.txt footer link with i18n accessible label",
    });
  });

  it("strips doubled squash-merge PR suffixes", () => {
    expect(
      cleanCommitSubject(
        'feat: What\'s New nav entry + automatic "New" badge (#713) (#719)'
      )
    ).toEqual({
      type: "feature",
      text: 'What\'s New nav entry + automatic "New" badge',
    });
  });

  it("preserves non-issue parentheticals such as (foundation)", () => {
    expect(
      cleanCommitSubject(
        "feat: What's New /whats-new/ changelog page (foundation) (#718)"
      )
    ).toEqual({
      type: "feature",
      text: "What's New /whats-new/ changelog page (foundation)",
    });
  });

  it("tolerates a conventional-commit breaking-change marker", () => {
    expect(cleanCommitSubject("feat!: drop the legacy API (#9)")).toEqual({
      type: "feature",
      text: "drop the legacy API",
    });
  });

  it("strips a scope and breaking-change marker together", () => {
    expect(cleanCommitSubject("fix(core)!: boom (#9)")).toEqual({
      type: "fix",
      text: "boom",
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
