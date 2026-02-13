import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CHUNK_RELOAD_SSK } from "../constants";

const reloadMock = vi.fn();

beforeEach(() => {
  reloadMock.mockClear();
  sessionStorage.clear();
  Object.defineProperty(window, "location", {
    value: { pathname: "/flashcard", search: "", reload: reloadMock },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

vi.mock("react", () => ({
  lazy: (factory: () => Promise<unknown>) => factory,
}));

function callFactory(lazyResult: unknown): Promise<{ default: unknown }> {
  const factory = lazyResult as () => Promise<{ default: unknown }>;
  return factory();
}

describe("lazyWithReload", () => {
  it("passes through a successful import", async () => {
    const { lazyWithReload } = await import("./lazy-with-reload");

    const FakeComponent = () => null;
    const result = lazyWithReload(() =>
      Promise.resolve({ default: FakeComponent })
    );

    const resolved = await callFactory(result);
    expect(resolved.default).toBe(FakeComponent);
  });

  it.each([
    [
      "Chrome/Edge",
      "Failed to fetch dynamically imported module: /assets/flashcard-DrWAC-jS.js",
    ],
    [
      "Firefox",
      "error loading dynamically imported module: /assets/flashcard-DrWAC-jS.js",
    ],
    ["Safari", "Importing a module script failed."],
  ])("reloads on stale chunk error from %s", async (_browser, errorMessage) => {
    const { lazyWithReload } = await import("./lazy-with-reload");

    const result = lazyWithReload(() =>
      Promise.reject(new TypeError(errorMessage))
    );

    const raceResult = await Promise.race([
      callFactory(result).then(() => "resolved"),
      new Promise<string>((resolve) =>
        setTimeout(() => resolve("pending"), 50)
      ),
    ]);

    expect(raceResult).toBe("pending");
    expect(reloadMock).toHaveBeenCalledOnce();
    expect(sessionStorage.getItem(`${CHUNK_RELOAD_SSK}/flashcard`)).toBe("1");
  });

  it("re-throws stale chunk error if already reloaded", async () => {
    const { lazyWithReload } = await import("./lazy-with-reload");

    sessionStorage.setItem(`${CHUNK_RELOAD_SSK}/flashcard`, "1");

    const result = lazyWithReload(() =>
      Promise.reject(
        new TypeError(
          "Failed to fetch dynamically imported module: /assets/flashcard-DrWAC-jS.js"
        )
      )
    );

    await expect(callFactory(result)).rejects.toThrow(TypeError);
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it("re-throws non-stale errors unchanged", async () => {
    const { lazyWithReload } = await import("./lazy-with-reload");

    const error = new Error("Network error");
    const result = lazyWithReload(() => Promise.reject(error));

    await expect(callFactory(result)).rejects.toThrow(error);
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it("re-throws non-TypeError with matching message unchanged", async () => {
    const { lazyWithReload } = await import("./lazy-with-reload");

    const error = new Error(
      "Failed to fetch dynamically imported module: /assets/flashcard-DrWAC-jS.js"
    );
    const result = lazyWithReload(() => Promise.reject(error));

    await expect(callFactory(result)).rejects.toThrow(error);
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it("re-throws if chunk-reloaded URL param is present", async () => {
    const { lazyWithReload } = await import("./lazy-with-reload");

    Object.defineProperty(window, "location", {
      value: {
        pathname: "/flashcard",
        search: "?chunk-reloaded=1",
        reload: reloadMock,
      },
      writable: true,
      configurable: true,
    });

    const result = lazyWithReload(() =>
      Promise.reject(
        new TypeError(
          "Failed to fetch dynamically imported module: /assets/flashcard-DrWAC-jS.js"
        )
      )
    );

    await expect(callFactory(result)).rejects.toThrow(TypeError);
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it("falls back to URL param when sessionStorage.setItem throws", async () => {
    const { lazyWithReload } = await import("./lazy-with-reload");

    vi.spyOn(
      Object.getPrototypeOf(sessionStorage),
      "setItem"
    ).mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });

    const result = lazyWithReload(() =>
      Promise.reject(
        new TypeError(
          "Failed to fetch dynamically imported module: /assets/flashcard-DrWAC-jS.js"
        )
      )
    );

    const raceResult = await Promise.race([
      callFactory(result).then(() => "resolved"),
      new Promise<string>((resolve) =>
        setTimeout(() => resolve("pending"), 50)
      ),
    ]);

    expect(raceResult).toBe("pending");
    expect(reloadMock).not.toHaveBeenCalled();
    expect(window.location.search).toBe("chunk-reloaded=1");
  });
});
