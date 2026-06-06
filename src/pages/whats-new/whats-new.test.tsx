import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WHATS_NEW_ENTRIES } from "../../data/whats-new";
import { render } from "../../test-utils";
import { WhatsNew } from "./whats-new";

describe("WhatsNew", () => {
  it("renders the page heading", () => {
    render(<WhatsNew />);
    expect(
      screen.getByRole("heading", { level: 1, name: "What's New" })
    ).toBeInTheDocument();
  });

  it("renders one entry per changelog item, newest first", () => {
    render(<WhatsNew />);
    const entryHeadings = screen.getAllByRole("heading", { level: 2 });
    expect(entryHeadings).toHaveLength(WHATS_NEW_ENTRIES.length);
    expect(entryHeadings[0]).toHaveTextContent(WHATS_NEW_ENTRIES[0].title.en);
  });
});
