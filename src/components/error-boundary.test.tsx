import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from "vitest";
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
    const [errorArg] = mockTrackError.mock.calls[0];
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
    const [errorArg] = mockTrackError.mock.calls[0];
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
});
