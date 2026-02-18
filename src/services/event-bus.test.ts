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
        mode: "flashcard",
        config: { type: "structured", totalQuestions: 10 },
      });

      expect(listener).toHaveBeenCalledOnce();
      expect(listener).toHaveBeenCalledWith({
        mode: "flashcard",
        config: { type: "structured", totalQuestions: 10 },
      });

      unsubscribe();
    });

    it("delivers the SESSION_COMPLETED payload to a subscribed listener", () => {
      const listener = vi.fn();
      const unsubscribe = eventBus.subscribe.SESSION_COMPLETED(listener);

      eventBus.emit.SESSION_COMPLETED({
        mode: "flashcard",
        accuracy: 0.85,
        questionsCompleted: 10,
      });

      expect(listener).toHaveBeenCalledOnce();
      expect(listener).toHaveBeenCalledWith({
        mode: "flashcard",
        accuracy: 0.85,
        questionsCompleted: 10,
      });

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
});
