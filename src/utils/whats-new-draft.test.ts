import { describe, expect, it } from "vitest";
import { cleanCommitSubject } from "./whats-new-draft";

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
