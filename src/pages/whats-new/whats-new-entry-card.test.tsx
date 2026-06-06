import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { WhatsNewEntry } from "../../data/whats-new";
import { render } from "../../test-utils";
import { WhatsNewEntryCard } from "./whats-new-entry-card";

const baseEntry: WhatsNewEntry = {
  id: "test-entry",
  releasedAt: "2026-06-05T13:30:00Z",
  type: "feature",
  title: {
    en: "English title",
    fr: "Titre français",
    es: "Título español",
    de: "Deutscher Titel",
    it: "Titolo italiano",
    nl: "Nederlandse titel",
    pt: "Título português",
  },
};

describe("WhatsNewEntryCard", () => {
  it("renders the title in the requested language", () => {
    render(<WhatsNewEntryCard entry={baseEntry} lang="fr" />);
    expect(screen.getByText("Titre français")).toBeInTheDocument();
  });

  it("renders a <time> element carrying the ISO releasedAt", () => {
    const { container } = render(
      <WhatsNewEntryCard entry={baseEntry} lang="en" />
    );
    const time = container.querySelector<HTMLTimeElement>("time");
    expect(time).not.toBeNull();
    expect(time?.dateTime).toBe("2026-06-05T13:30:00Z");
  });

  it("renders the optional body when present", () => {
    const withBody: WhatsNewEntry = {
      ...baseEntry,
      body: {
        en: "Body text",
        fr: "Corps",
        es: "Cuerpo",
        de: "Textkörper",
        it: "Corpo",
        nl: "Hoofdtekst",
        pt: "Corpo",
      },
    };
    render(<WhatsNewEntryCard entry={withBody} lang="en" />);
    expect(screen.getByText("Body text")).toBeInTheDocument();
  });

  it("omits the body when absent", () => {
    render(<WhatsNewEntryCard entry={baseEntry} lang="en" />);
    expect(screen.queryByText("Body text")).not.toBeInTheDocument();
  });

  it("renders the localized type badge", () => {
    const stackEntry: WhatsNewEntry = { ...baseEntry, type: "stack" };
    render(<WhatsNewEntryCard entry={stackEntry} lang="en" />);
    expect(screen.getByText("New stack")).toBeInTheDocument();
  });
});
