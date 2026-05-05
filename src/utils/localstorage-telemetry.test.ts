import { afterEach, describe, expect, it, vi } from "vitest";
import { analytics } from "../services/analytics";
import { reportLocalDbCorruption } from "./localstorage-telemetry";

describe("reportLocalDbCorruption", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("redacts an Error cause's message but preserves its name in the wrapper", () => {
    const trackErrorSpy = vi
      .spyOn(analytics, "trackError")
      .mockImplementation(() => undefined);

    const cause = new Error("validation failed");
    reportLocalDbCorruption("settings", cause);

    expect(trackErrorSpy).toHaveBeenCalledTimes(1);
    const [errArg, contextArg] = trackErrorSpy.mock.calls[0] ?? [];
    expect(errArg).toBeInstanceOf(Error);
    expect(errArg?.name).toBe("LocalDbCorruption");
    expect(errArg?.message).toBe("type=Error name=Error");
    expect(errArg?.message).not.toContain("validation failed");
    expect(contextArg).toBe("key=settings");
    expect(cause.name).toBe("Error");
  });

  it("does not leak a SyntaxError's input-snippet message to GA", () => {
    const trackErrorSpy = vi
      .spyOn(analytics, "trackError")
      .mockImplementation(() => undefined);

    const cause = new SyntaxError(
      'Unexpected token \'X\', "{"sessions":[{"id":"secret-' +
        "... is not valid JSON"
    );
    reportLocalDbCorruption("history", cause);

    const [errArg] = trackErrorSpy.mock.calls[0] ?? [];
    expect(errArg?.message).toBe("type=Error name=SyntaxError");
    expect(errArg?.message).not.toContain("secret-");
    expect(errArg?.message).not.toContain("sessions");
  });

  it("wraps a non-Error object cause with its typeof rather than its contents", () => {
    const trackErrorSpy = vi
      .spyOn(analytics, "trackError")
      .mockImplementation(() => undefined);

    reportLocalDbCorruption("history", { unexpected: "shape" });

    expect(trackErrorSpy).toHaveBeenCalledTimes(1);
    const [errArg, contextArg] = trackErrorSpy.mock.calls[0] ?? [];
    expect(errArg).toBeInstanceOf(Error);
    expect(errArg?.name).toBe("LocalDbCorruption");
    expect(errArg?.message).toBe("type=object");
    expect(contextArg).toBe("key=history");
  });

  it("does not embed a raw string cause in the Error message", () => {
    const trackErrorSpy = vi
      .spyOn(analytics, "trackError")
      .mockImplementation(() => undefined);

    const sensitive = '{"sessions":[{"id":"secret-123","score":42}]}';
    reportLocalDbCorruption("history", sensitive);

    expect(trackErrorSpy).toHaveBeenCalledTimes(1);
    const [errArg] = trackErrorSpy.mock.calls[0] ?? [];
    expect(errArg).toBeInstanceOf(Error);
    expect(errArg?.name).toBe("LocalDbCorruption");
    expect(errArg?.message).not.toContain("secret-123");
    expect(errArg?.message).not.toContain(sensitive);
    expect(errArg?.message).toBe(`type=string length=${sensitive.length}`);
  });

  it("includes the offending key in the context argument", () => {
    const trackErrorSpy = vi
      .spyOn(analytics, "trackError")
      .mockImplementation(() => undefined);

    reportLocalDbCorruption("memdeck:flashcard-timer", new Error("x"));

    expect(trackErrorSpy).toHaveBeenCalledWith(
      expect.any(Error),
      "key=memdeck:flashcard-timer"
    );
  });
});
