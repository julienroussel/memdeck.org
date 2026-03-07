import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "../test-utils";
import { PwaInstallPrompt } from "./pwa-install-prompt";

const TAP_THE_MENU_PATTERN = /Tap the menu/;
const TAP_THE_SHARE_PATTERN = /Tap the Share/;

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("PwaInstallPrompt", () => {
  it("does not render modal when closed", () => {
    render(<PwaInstallPrompt onClose={vi.fn()} opened={false} />);
    expect(
      screen.queryByText("Install MemDeck", {
        selector: ".mantine-Modal-title",
      })
    ).not.toBeInTheDocument();
  });

  it("renders modal with instructions when opened", () => {
    render(<PwaInstallPrompt onClose={vi.fn()} opened={true} />);
    expect(
      screen.getByText("Install MemDeck", {
        selector: ".mantine-Modal-title",
      })
    ).toBeInTheDocument();
  });

  it("renders Android install instructions by default", () => {
    render(<PwaInstallPrompt onClose={vi.fn()} opened={true} />);
    expect(screen.getByText(TAP_THE_MENU_PATTERN)).toBeInTheDocument();
  });

  it("renders iOS install instructions when user agent is iPhone", () => {
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)",
      configurable: true,
    });
    render(<PwaInstallPrompt onClose={vi.fn()} opened={true} />);
    expect(screen.getByText(TAP_THE_SHARE_PATTERN)).toBeInTheDocument();
  });
});
