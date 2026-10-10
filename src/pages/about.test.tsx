import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "../test-utils";
import { About } from "./about";

const mockShareMemDeck = vi.fn();
vi.mock("../utils/share", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../utils/share")>()),
  shareMemDeck: (...args: unknown[]) => mockShareMemDeck(...args),
}));

const mockTrackShareClicked = vi.fn();
vi.mock("../services/analytics", () => ({
  analytics: {
    trackShareClicked: (...args: unknown[]) => mockTrackShareClicked(...args),
  },
}));

const mockNotificationsShow = vi.fn();
vi.mock("@mantine/notifications", () => ({
  notifications: {
    show: (...args: unknown[]) => mockNotificationsShow(...args),
  },
}));

beforeEach(() => {
  mockShareMemDeck.mockReset();
  mockTrackShareClicked.mockReset();
  mockNotificationsShow.mockReset();
});

const clickShare = async () => {
  const user = userEvent.setup();
  render(<About />);
  await user.click(screen.getByRole("button", { name: "Share MemDeck" }));
};

describe("About share link", () => {
  it("shows a green 'Link copied!' notification when the message is copied", async () => {
    mockShareMemDeck.mockResolvedValue("copied");
    await clickShare();

    await waitFor(() => {
      expect(mockTrackShareClicked).toHaveBeenCalledWith("about", "copied");
    });
    expect(mockNotificationsShow).toHaveBeenCalledWith({
      color: "green",
      message: "Link copied!",
    });
  });

  it("shows a red error notification when share fails", async () => {
    mockShareMemDeck.mockResolvedValue("failed");
    await clickShare();

    await waitFor(() => {
      expect(mockTrackShareClicked).toHaveBeenCalledWith("about", "failed");
    });
    expect(mockNotificationsShow).toHaveBeenCalledWith({
      color: "red",
      message: "Something went wrong",
    });
  });

  it("tracks 'cancelled' and shows no notification when the share sheet is dismissed", async () => {
    mockShareMemDeck.mockResolvedValue("cancelled");
    await clickShare();

    await waitFor(() => {
      expect(mockTrackShareClicked).toHaveBeenCalledWith("about", "cancelled");
    });
    expect(mockNotificationsShow).not.toHaveBeenCalled();
  });
});
