import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router";
import { describe, expect, it } from "vitest";
import { FocusOnNavigate } from "./focus-on-navigate";

const NavigateButton = ({ to }: { to: string }) => {
  const navigate = useNavigate();
  return (
    <button onClick={() => navigate(to)} type="button">
      Navigate
    </button>
  );
};

const TestApp = ({ initialPath = "/" }: { initialPath?: string }) => (
  <MemoryRouter initialEntries={[initialPath]}>
    <FocusOnNavigate />
    <main>
      <Routes>
        <Route element={<NavigateButton to="/other" />} path="/" />
        <Route element={<div>Other page</div>} path="/other" />
      </Routes>
    </main>
  </MemoryRouter>
);

describe("FocusOnNavigate", () => {
  it("does not move focus on initial render", () => {
    render(<TestApp />);

    const main = document.querySelector("main");
    expect(main).not.toHaveAttribute("tabindex");
    expect(main).not.toHaveFocus();
  });

  it("moves focus to main element on route change", async () => {
    const user = userEvent.setup();
    render(<TestApp />);

    await user.click(screen.getByRole("button", { name: "Navigate" }));

    const main = document.querySelector("main");
    expect(main).toHaveAttribute("tabindex", "-1");
    expect(main).toHaveFocus();
  });

  it("removes tabindex from main after blur", async () => {
    const user = userEvent.setup();
    render(<TestApp />);

    await user.click(screen.getByRole("button", { name: "Navigate" }));

    const main = document.querySelector("main");
    expect(main).toHaveAttribute("tabindex", "-1");

    main?.blur();

    expect(main).not.toHaveAttribute("tabindex");
  });

  it("does nothing if no main element exists", async () => {
    const user = userEvent.setup();

    const TestAppNoMain = () => (
      <MemoryRouter initialEntries={["/"]}>
        <FocusOnNavigate />
        <div>
          <Routes>
            <Route element={<NavigateButton to="/other" />} path="/" />
            <Route element={<div>Other page</div>} path="/other" />
          </Routes>
        </div>
      </MemoryRouter>
    );

    render(<TestAppNoMain />);

    // Should not throw when navigating without a main element
    await user.click(screen.getByRole("button", { name: "Navigate" }));

    expect(document.querySelector("main")).toBeNull();
  });
});
