import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "i18next";
import { Link, Route, Routes } from "react-router";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from "vitest";
import frLocale from "../i18n/locales/fr.json";
import { render } from "../test-utils";
import { ErrorBoundary } from "./error-boundary";

const mockTrackError = vi.fn();
vi.mock("../services/analytics", () => ({
  analytics: {
    trackError: (...args: unknown[]) => mockTrackError(...args),
  },
}));

const Bomb = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error("boom");
  }
  return <div>recovered</div>;
};

const nonErrorValue: unknown = "string failure";

const StaleChunkBomb = () => {
  throw new TypeError(
    "Failed to fetch dynamically imported module: /assets/flashcard-DrWAC-jS.js"
  );
};

const StringBomb = () => {
  throw nonErrorValue;
};

describe("ErrorBoundary", () => {
  let consoleErrorSpy: MockInstance;

  beforeEach(() => {
    mockTrackError.mockClear();
    // React logs every caught render error; silence it to keep test output clean.
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {
      // Intentionally empty
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("renders the fallback when a child throws an Error", () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>
    );

    expect(
      screen.getByRole("heading", { name: "Something went wrong" })
    ).toBeInTheDocument();
  });

  it("reports the thrown Error to analytics with the component stack", () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>
    );

    expect(mockTrackError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.any(String)
    );
    const errorArg = mockTrackError.mock.calls[0]?.[0];
    expect(errorArg).toBeInstanceOf(Error);
    if (errorArg instanceof Error) {
      expect(errorArg.message).toBe("boom");
    }
  });

  it("wraps a non-Error thrown value in an Error before reporting it", () => {
    render(
      <ErrorBoundary>
        <StringBomb />
      </ErrorBoundary>
    );

    expect(
      screen.getByRole("heading", { name: "Something went wrong" })
    ).toBeInTheDocument();
    expect(mockTrackError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.any(String)
    );
    const errorArg = mockTrackError.mock.calls[0]?.[0];
    expect(errorArg).toBeInstanceOf(Error);
    if (errorArg instanceof Error) {
      expect(errorArg.message).toBe("string failure");
    }
  });

  it("re-renders children when Try again is clicked", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>
    );

    expect(
      screen.getByRole("heading", { name: "Something went wrong" })
    ).toBeInTheDocument();

    rerender(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>
    );
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(screen.getByText("recovered")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Something went wrong" })
    ).not.toBeInTheDocument();
  });
  it("renders the new route after navigating away from a route error", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Link to="/other/">Other</Link>
        <ErrorBoundary>
          <Routes>
            <Route element={<Bomb shouldThrow />} path="/" />
            <Route element={<div>other route</div>} path="/other/" />
          </Routes>
        </ErrorBoundary>
      </>
    );

    expect(
      screen.getByRole("heading", { name: "Something went wrong" })
    ).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Other" }));

    expect(screen.getByText("other route")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Something went wrong" })
    ).not.toBeInTheDocument();
  });

  it("reloads the page on Try again after a stale chunk error", async () => {
    const user = userEvent.setup();
    const reloadSpy = vi
      .spyOn(window.location, "reload")
      .mockImplementation(() => {
        // Intentionally empty: a real reload would tear down the test page
      });
    render(
      <ErrorBoundary>
        <StaleChunkBomb />
      </ErrorBoundary>
    );

    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(reloadSpy).toHaveBeenCalledOnce();
    reloadSpy.mockRestore();
  });

  it("renders the fallback in the active non-English language", async () => {
    i18n.addResourceBundle("fr", "translation", frLocale);
    await i18n.changeLanguage("fr");
    try {
      render(
        <ErrorBoundary>
          <Bomb shouldThrow />
        </ErrorBoundary>
      );

      expect(
        screen.getByRole("heading", { name: "Une erreur est survenue" })
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "Une erreur inattendue s'est produite. Réessayez ou actualisez la page."
        )
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Réessayer" })
      ).toBeInTheDocument();
    } finally {
      await i18n.changeLanguage("en");
      i18n.removeResourceBundle("fr", "translation");
    }
  });
});
