import { describe, expect, it, vi } from "vitest";
import { eventBus } from "./event-bus";

describe("eventBus", () => {
  describe("emit and subscribe", () => {
    it("delivers the payload to a subscribed listener", () => {
      const listener = vi.fn();
      const unsubscribe = eventBus.subscribe.STACK_SELECTED(listener);

      eventBus.emit.STACK_SELECTED({ stackName: "Mnemonica" });

      expect(listener).toHaveBeenCalledOnce();
      expect(listener).toHaveBeenCalledWith({ stackName: "Mnemonica" });

      unsubscribe();
    });

    it("delivers the payload to multiple listeners", () => {
      const listenerA = vi.fn();
      const listenerB = vi.fn();
      const unsubA = eventBus.subscribe.FLASHCARD_ANSWER(listenerA);
      const unsubB = eventBus.subscribe.FLASHCARD_ANSWER(listenerB);

      eventBus.emit.FLASHCARD_ANSWER({
        correct: true,
        stackName: "Aronson",
      });

      expect(listenerA).toHaveBeenCalledOnce();
      expect(listenerB).toHaveBeenCalledOnce();
      expect(listenerA).toHaveBeenCalledWith({
        correct: true,
        stackName: "Aronson",
      });

      unsubA();
      unsubB();
    });

    it("does not call a listener after it has been unsubscribed", () => {
      const listener = vi.fn();
      const unsubscribe = eventBus.subscribe.FLASHCARD_MODE_CHANGED(listener);

      unsubscribe();

      eventBus.emit.FLASHCARD_MODE_CHANGED({ mode: "cardonly" });

      expect(listener).not.toHaveBeenCalled();
    });

    it("does not cross-deliver events between different channels", () => {
      const stackListener = vi.fn();
      const answerListener = vi.fn();
      const unsubStack = eventBus.subscribe.STACK_SELECTED(stackListener);
      const unsubAnswer = eventBus.subscribe.FLASHCARD_ANSWER(answerListener);

      eventBus.emit.STACK_SELECTED({ stackName: "Redford" });

      expect(stackListener).toHaveBeenCalledOnce();
      expect(answerListener).not.toHaveBeenCalled();

      unsubStack();
      unsubAnswer();
    });

    it("delivers the ACAAN_ANSWER payload to a subscribed listener", () => {
      const listener = vi.fn();
      const unsubscribe = eventBus.subscribe.ACAAN_ANSWER(listener);

      eventBus.emit.ACAAN_ANSWER({ correct: true, stackName: "Mnemonica" });

      expect(listener).toHaveBeenCalledOnce();
      expect(listener).toHaveBeenCalledWith({
        correct: true,
        stackName: "Mnemonica",
      });

      unsubscribe();
    });

    it("delivers the SESSION_STARTED payload to a subscribed listener", () => {
      const listener = vi.fn();
      const unsubscribe = eventBus.subscribe.SESSION_STARTED(listener);

      eventBus.emit.SESSION_STARTED({
        config: { totalQuestions: 10, type: "structured" },
        mode: "flashcard",
      });

      expect(listener).toHaveBeenCalledOnce();
      expect(listener).toHaveBeenCalledWith({
        config: { totalQuestions: 10, type: "structured" },
        mode: "flashcard",
      });

      unsubscribe();
    });

    it("delivers the SESSION_COMPLETED payload to a subscribed listener", () => {
      const listener = vi.fn();
      const unsubscribe = eventBus.subscribe.SESSION_COMPLETED(listener);

      eventBus.emit.SESSION_COMPLETED({
        accuracy: 0.85,
        mode: "flashcard",
        questionsCompleted: 10,
        saved: true,
      });

      expect(listener).toHaveBeenCalledOnce();
      expect(listener).toHaveBeenCalledWith({
        accuracy: 0.85,
        mode: "flashcard",
        questionsCompleted: 10,
        saved: true,
      });

      unsubscribe();
    });

    it("does not deliver past events to a listener that subscribes after emit", () => {
      eventBus.emit.STACK_SELECTED({ stackName: "Particle" });

      const listener = vi.fn();
      const unsubscribe = eventBus.subscribe.STACK_SELECTED(listener);

      expect(listener).not.toHaveBeenCalled();

      unsubscribe();
    });

    it("supports subscribing the same listener multiple times without duplication", () => {
      const listener = vi.fn();
      // Set-based listeners means adding the same function reference twice is idempotent
      const unsub1 = eventBus.subscribe.STACK_SELECTED(listener);
      const unsub2 = eventBus.subscribe.STACK_SELECTED(listener);

      eventBus.emit.STACK_SELECTED({ stackName: "Memorandum" });

      expect(listener).toHaveBeenCalledOnce();

      unsub1();
      unsub2();
    });
  });

  describe("listener isolation", () => {
    it("logs a listener exception in DEV and continues iterating over remaining subscribers", () => {
      // Vitest runs with import.meta.env.DEV === true. The bus logs to
      // console.error and schedules an asynchronous rethrow via
      // queueMicrotask so DevTools sees the error without aborting iteration
      // over remaining subscribers.
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => undefined);
      // Intercept queueMicrotask so the asynchronous rethrow does not surface
      // as an uncaught exception in the test runner. We assert it was scheduled.
      const queuedThrows: unknown[] = [];
      const queueSpy = vi
        .spyOn(globalThis, "queueMicrotask")
        .mockImplementation((cb: () => void) => {
          try {
            cb();
          } catch (err) {
            queuedThrows.push(err);
          }
        });

      const throwing = vi.fn(() => {
        throw new Error("listener boom");
      });
      const survivor = vi.fn();
      const unsubA = eventBus.subscribe.STACK_SELECTED(throwing);
      const unsubB = eventBus.subscribe.STACK_SELECTED(survivor);

      expect(() =>
        eventBus.emit.STACK_SELECTED({ stackName: "Mnemonica" })
      ).not.toThrow();
      expect(throwing).toHaveBeenCalledOnce();
      expect(survivor).toHaveBeenCalledOnce();
      expect(survivor).toHaveBeenCalledWith({ stackName: "Mnemonica" });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("[eventBus] listener for STACK_SELECTED threw"),
        expect.any(Error)
      );
      expect(queuedThrows).toHaveLength(1);
      expect(queuedThrows[0]).toBeInstanceOf(Error);

      unsubA();
      unsubB();
      queueSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it("isolates listener failures in production: a throwing subscriber does not abort iteration over remaining subscribers", async () => {
      // In production import.meta.env.DEV is false and the bus swallows
      // listener exceptions so one bad subscriber (e.g. an ad-blocker shim
      // around analytics) cannot kill all telemetry. Stub DEV=false and
      // re-import the bus module so we exercise the swallow branch.
      vi.resetModules();
      vi.stubEnv("DEV", false);
      const { eventBus: prodBus } = await import("./event-bus");

      const throwing = vi.fn(() => {
        throw new Error("listener boom");
      });
      const survivor = vi.fn();
      const unsubA = prodBus.subscribe.SESSION_COMPLETED(throwing);
      const unsubB = prodBus.subscribe.SESSION_COMPLETED(survivor);

      expect(() =>
        prodBus.emit.SESSION_COMPLETED({
          accuracy: 0.5,
          mode: "flashcard",
          questionsCompleted: 10,
          saved: true,
        })
      ).not.toThrow();

      expect(throwing).toHaveBeenCalledOnce();
      expect(survivor).toHaveBeenCalledOnce();

      unsubA();
      unsubB();
      vi.unstubAllEnvs();
      vi.resetModules();
    });
  });
});
