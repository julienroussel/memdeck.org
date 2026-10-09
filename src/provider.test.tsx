import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from "vitest";
import { Provider } from "./provider";

const failures = vi.hoisted(() => ({ header: false, mantine: false }));

vi.mock("@mantine/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@mantine/core")>();
  const MantineProvider = (
    props: ComponentProps<typeof actual.MantineProvider>
  ) => {
    if (failures.mantine) {
      throw new Error("MantineProvider failed");
    }
    return <actual.MantineProvider {...props} />;
  };
  return { ...actual, MantineProvider };
});

vi.mock("./components/header", () => ({
  Header: () => {
    if (failures.header) {
      throw new Error("Header failed");
    }
    return null;
  },
}));

vi.mock("./components/language-load-notifier", () => ({
  LanguageLoadNotifier: () => null,
}));

vi.mock("./services/analytics", () => ({
  analytics: {
    initialize: vi.fn(),
    trackError: vi.fn(),
    trackPageView: vi.fn(),
  },
}));

const addSplash = () => {
  const splash = document.createElement("div");
  splash.id = "splash";
  document.body.appendChild(splash);
};

describe("Provider error fallbacks", () => {
  let consoleErrorSpy: MockInstance;

  beforeEach(() => {
    failures.header = false;
    failures.mantine = false;
    addSplash();
    // React logs every caught render error; silence it to keep output clean.
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {
      // Intentionally empty
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    document.getElementById("splash")?.remove();
  });

  it("removes the splash and shows a working Refresh button when Header throws on first render", async () => {
    failures.header = true;
    const user = userEvent.setup();
    render(<Provider />);

    expect(
      screen.getByRole("heading", { name: "Application Error" })
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(document.getElementById("splash")).toBeNull();
    });

    const reloadSpy = vi
      .spyOn(window.location, "reload")
      .mockImplementation(() => {
        // Intentionally empty: a real reload would tear down the test page
      });
    await user.click(screen.getByRole("button", { name: "Refresh Page" }));
    expect(reloadSpy).toHaveBeenCalledOnce();
    reloadSpy.mockRestore();
  });

  it("removes the splash when the outer fallback renders", async () => {
    failures.mantine = true;
    render(<Provider />);

    expect(screen.getByRole("alert")).toHaveTextContent("Application Error");
    expect(
      screen.getByRole("button", { name: "Refresh Page" })
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(document.getElementById("splash")).toBeNull();
    });
  });
});
