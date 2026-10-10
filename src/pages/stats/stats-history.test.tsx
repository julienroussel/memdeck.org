import { screen } from "@testing-library/react";
import i18n from "i18next";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "../../test-utils";
import { makeSessionRecord } from "../../test-utils/session-factories";
import { StatsHistory } from "./stats-history";

afterEach(async () => {
  vi.restoreAllMocks();
  await i18n.changeLanguage("en");
});

describe("StatsHistory", () => {
  it("formats the Date column in the app language, regardless of the browser locale", async () => {
    await i18n.changeLanguage("fr");
    const toLocaleDateString = vi.spyOn(Date.prototype, "toLocaleDateString");

    render(<StatsHistory history={[makeSessionRecord()]} />);

    expect(toLocaleDateString).toHaveBeenCalledWith(
      "fr",
      expect.objectContaining({ month: "short" })
    );
  });

  it("renders accuracy and duration through the catalog", () => {
    render(
      <StatsHistory
        history={[makeSessionRecord({ accuracy: 0.8, durationSeconds: 150 })]}
      />
    );

    expect(screen.getByText("80%")).toBeInTheDocument();
    expect(screen.getByText("2m 30s")).toBeInTheDocument();
  });
});
