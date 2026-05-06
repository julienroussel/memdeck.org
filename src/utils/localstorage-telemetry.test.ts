import { notifications } from "@mantine/notifications";
import i18next from "i18next";
import { afterEach, describe, expect, it, vi } from "vitest";
import { analytics } from "../services/analytics";
import {
  handleLocalDbWriteFailed,
  notifyLocalDbWriteFailed,
  reportLocalDbCorruption,
  reportLocalDbWriteFailed,
} from "./localstorage-telemetry";

// `as` justified: i18next.t has overloaded TFunction signatures; vi.fn's
// mockImplementation only accepts a single signature. We don't exercise the
// interpolation overloads in these tests.
type TFn = typeof i18next.t;
const makeTMock = (fn: (key: string) => string): TFn => fn as TFn;

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

describe("reportLocalDbWriteFailed", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renames the wrapper to LocalDbWriteFailed and redacts the message", () => {
    const trackErrorSpy = vi
      .spyOn(analytics, "trackError")
      .mockImplementation(() => undefined);

    const cause = new DOMException(
      "quota detail leaks here",
      "QuotaExceededError"
    );
    reportLocalDbWriteFailed("flashcard-mode", cause);

    expect(trackErrorSpy).toHaveBeenCalledTimes(1);
    const [errArg, contextArg] = trackErrorSpy.mock.calls[0] ?? [];
    expect(errArg).toBeInstanceOf(Error);
    expect(errArg?.name).toBe("LocalDbWriteFailed");
    expect(errArg?.message).toBe("type=Error name=QuotaExceededError");
    expect(errArg?.message).not.toContain("quota detail");
    expect(contextArg).toBe("key=flashcard-mode");
  });

  it("wraps a string cause by length only", () => {
    const trackErrorSpy = vi
      .spyOn(analytics, "trackError")
      .mockImplementation(() => undefined);

    reportLocalDbWriteFailed("k", "abcd");

    const [errArg] = trackErrorSpy.mock.calls[0] ?? [];
    expect(errArg?.message).toBe("type=string length=4");
  });

  it("wraps a non-Error, non-string cause by typeof", () => {
    const trackErrorSpy = vi
      .spyOn(analytics, "trackError")
      .mockImplementation(() => undefined);

    reportLocalDbWriteFailed("k", 42);

    const [errArg] = trackErrorSpy.mock.calls[0] ?? [];
    expect(errArg?.message).toBe("type=number");
  });
});

describe("notifyLocalDbWriteFailed", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a Mantine notification with a key-scoped id and yellow color", () => {
    const showSpy = vi
      .spyOn(notifications, "show")
      .mockImplementation(() => "notification-id");
    vi.spyOn(i18next, "t").mockImplementation(makeTMock((key) => `tr:${key}`));

    notifyLocalDbWriteFailed("flashcard-mode");

    expect(showSpy).toHaveBeenCalledTimes(1);
    expect(showSpy).toHaveBeenCalledWith({
      id: "local-db-write-failed-flashcard-mode",
      color: "yellow",
      title: "tr:errors.localDbWriteFailed.title",
      message: "tr:errors.localDbWriteFailed.message",
    });
  });

  it("scopes the id per key so concurrent toasts don't collide", () => {
    const showSpy = vi
      .spyOn(notifications, "show")
      .mockImplementation(() => "id");
    vi.spyOn(i18next, "t").mockImplementation(makeTMock((key) => key));

    notifyLocalDbWriteFailed("a");
    notifyLocalDbWriteFailed("b");

    const ids = showSpy.mock.calls.map((args) => args[0].id);
    expect(ids).toEqual(["local-db-write-failed-a", "local-db-write-failed-b"]);
  });
});

describe("handleLocalDbWriteFailed", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("dispatches both the analytics report and the user-facing notification", () => {
    const trackErrorSpy = vi
      .spyOn(analytics, "trackError")
      .mockImplementation(() => undefined);
    const showSpy = vi
      .spyOn(notifications, "show")
      .mockImplementation(() => "id");
    vi.spyOn(i18next, "t").mockImplementation(makeTMock((key) => key));

    const cause = new DOMException("oops", "QuotaExceededError");
    handleLocalDbWriteFailed("flashcard-mode", cause);

    expect(trackErrorSpy).toHaveBeenCalledTimes(1);
    expect(showSpy).toHaveBeenCalledTimes(1);
    expect(showSpy.mock.calls[0]?.[0]).toMatchObject({
      id: "local-db-write-failed-flashcard-mode",
      color: "yellow",
    });
  });
});
