import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CHUNK_RELOAD_SSK } from "../constants";

const reloadMock = vi.fn();

beforeEach(() => {
  reloadMock.mockClear();
  sessionStorage.clear();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { pathname: "/flashcard", reload: reloadMock, search: "" },
    writable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

vi.mock("react", () => ({
  lazy: (factory: () => Promise<unknown>) => factory,
}));

function callFactory(lazyResult: unknown): Promise<{ default: unknown }> {
  // The `react` mock above makes `lazy` return its factory, which React's types do not model.
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

    // The recovery factory returns `new Promise<never>(() => {})` after
    // triggering the reload, so it never resolves. Flush microtasks so the
    // `.catch` runs, then race against a sentinel to assert "still pending"
    // without coupling to a wall-clock timeout.
    const factoryPromise = callFactory(result);
    // Two awaits to drain the chained `.catch` microtask in lazyWithReload.
    await Promise.resolve();
    await Promise.resolve();
    const pendingSentinel = Symbol("pending");
    const raceResult = await Promise.race([
      factoryPromise.then(() => "resolved"),
      Promise.resolve(pendingSentinel),
    ]);

    expect(raceResult).toBe(pendingSentinel);
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
      configurable: true,
      value: {
        pathname: "/flashcard",
        reload: reloadMock,
        search: "?chunk-reloaded=1",
      },
      writable: true,
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

    // happy-dom's Storage is a Proxy that binds its own methods onto the
    // instance, so a prototype spy is shadowed and an instance spy cannot be
    // restored. Swap the whole global for a stub the test fully controls.
    vi.stubGlobal("sessionStorage", {
      getItem: () => null,
      setItem: () => {
        throw new DOMException("QuotaExceededError");
      },
    });

    const result = lazyWithReload(() =>
      Promise.reject(
        new TypeError(
          "Failed to fetch dynamically imported module: /assets/flashcard-DrWAC-jS.js"
        )
      )
    );

    // Same shape as the reload-success test above: the recovery path returns
    // a never-resolving promise. Flush microtasks and race against a
    // pending sentinel instead of a wall-clock setTimeout.
    const factoryPromise = callFactory(result);
    await Promise.resolve();
    await Promise.resolve();
    const pendingSentinel = Symbol("pending");
    const raceResult = await Promise.race([
      factoryPromise.then(() => "resolved"),
      Promise.resolve(pendingSentinel),
    ]);

    expect(raceResult).toBe(pendingSentinel);
    expect(reloadMock).not.toHaveBeenCalled();
    expect(window.location.search).toBe("chunk-reloaded=1");
  });
  it("reloads again on a later stale chunk error once a load has succeeded", async () => {
    const { lazyWithReload } = await import("./lazy-with-reload");
    const staleError = () =>
      Promise.reject(
        new TypeError(
          "Failed to fetch dynamically imported module: /assets/flashcard-DrWAC-jS.js"
        )
      );
    const pendingSentinel = Symbol("pending");
    const expectPending = async (promise: Promise<unknown>) => {
      await Promise.resolve();
      await Promise.resolve();
      const raceResult = await Promise.race([
        promise.then(() => "resolved"),
        Promise.resolve(pendingSentinel),
      ]);
      expect(raceResult).toBe(pendingSentinel);
    };

    // First deploy: stale error triggers a reload and sets the guard.
    await expectPending(callFactory(lazyWithReload(staleError)));
    expect(reloadMock).toHaveBeenCalledOnce();

    // After the reload the chunk loads, which clears the guard.
    const FakeComponent = () => null;
    await callFactory(
      lazyWithReload(() => Promise.resolve({ default: FakeComponent }))
    );
    expect(sessionStorage.getItem(`${CHUNK_RELOAD_SSK}/flashcard`)).toBeNull();

    // Second deploy in the same tab: reload again instead of throwing.
    await expectPending(callFactory(lazyWithReload(staleError)));
    expect(reloadMock).toHaveBeenCalledTimes(2);
  });

  it("strips the chunk-reloaded URL param once a load has succeeded", async () => {
    const { lazyWithReload } = await import("./lazy-with-reload");
    const replaceStateSpy = vi
      .spyOn(window.history, "replaceState")
      .mockImplementation(() => {
        // Intentionally empty: the mocked location cannot navigate
      });

    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        hash: "#top",
        pathname: "/flashcard",
        reload: reloadMock,
        search: "?chunk-reloaded=1&try=neighbor",
      },
      writable: true,
    });

    const FakeComponent = () => null;
    await callFactory(
      lazyWithReload(() => Promise.resolve({ default: FakeComponent }))
    );

    expect(replaceStateSpy).toHaveBeenCalledWith(
      window.history.state,
      "",
      "/flashcard?try=neighbor#top"
    );
  });

  it("leaves the URL alone after a successful load without the param", async () => {
    const { lazyWithReload } = await import("./lazy-with-reload");
    const replaceStateSpy = vi.spyOn(window.history, "replaceState");

    const FakeComponent = () => null;
    await callFactory(
      lazyWithReload(() => Promise.resolve({ default: FakeComponent }))
    );

    expect(replaceStateSpy).not.toHaveBeenCalled();
  });
});
