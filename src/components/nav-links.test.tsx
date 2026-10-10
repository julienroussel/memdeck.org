import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { ROUTES } from "../constants";
import { NavLinks } from "./nav-links";

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <MantineProvider>
        <NavLinks onClick={vi.fn()} />
      </MantineProvider>
    </MemoryRouter>
  );

const getCurrentLinks = (): HTMLElement[] =>
  screen
    .getAllByRole("link")
    .filter((link) => link.getAttribute("aria-current") === "page");

// FAQ is reachable by URL but has no nav entry, so no link is current there.
const routesWithoutNavLink: readonly string[] = [ROUTES.faq];
const navRoutes = Object.values(ROUTES).filter(
  (path) => !routesWithoutNavLink.includes(path)
);

describe("NavLinks", () => {
  it.each(navRoutes)(
    "marks only the link to %s with aria-current=page",
    (path) => {
      renderAt(path);

      const currentLinks = getCurrentLinks();

      expect(currentLinks).toHaveLength(1);
      expect(currentLinks[0]).toHaveAttribute("href", path);
    }
  );

  it.each(routesWithoutNavLink)(
    "marks no link with aria-current=page on %s",
    (path) => {
      renderAt(path);

      expect(getCurrentLinks()).toHaveLength(0);
    }
  );
});
