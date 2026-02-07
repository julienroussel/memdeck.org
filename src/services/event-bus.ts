import type { FlashcardMode } from "../types/flashcard";

type AnalyticsEvents = {
  STACK_SELECTED: { stackName: string };
  FLASHCARD_ANSWER: { correct: boolean; stackName: string };
  FLASHCARD_MODE_CHANGED: { mode: FlashcardMode };
};

type Listener<T> = (payload: T) => void;

// Create a type-safe event channel for a specific event type
const createChannel = <T>() => {
  const listeners = new Set<Listener<T>>();

  return {
    emit(payload: T): void {
      for (const listener of listeners) {
        listener(payload);
      }
    },
    subscribe(listener: Listener<T>): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
};

// Each channel is independently typed - no assertions needed anywhere
const stackSelectedChannel = createChannel<AnalyticsEvents["STACK_SELECTED"]>();
const flashcardAnswerChannel =
  createChannel<AnalyticsEvents["FLASHCARD_ANSWER"]>();
const flashcardModeChangedChannel =
  createChannel<AnalyticsEvents["FLASHCARD_MODE_CHANGED"]>();

// Event bus with discriminated method access - full type safety through structure
export const eventBus = {
  emit: {
    STACK_SELECTED: stackSelectedChannel.emit,
    FLASHCARD_ANSWER: flashcardAnswerChannel.emit,
    FLASHCARD_MODE_CHANGED: flashcardModeChangedChannel.emit,
  },
  subscribe: {
    STACK_SELECTED: stackSelectedChannel.subscribe,
    FLASHCARD_ANSWER: flashcardAnswerChannel.subscribe,
    FLASHCARD_MODE_CHANGED: flashcardModeChangedChannel.subscribe,
  },
} satisfies {
  emit: { [K in keyof AnalyticsEvents]: (payload: AnalyticsEvents[K]) => void };
  subscribe: {
    [K in keyof AnalyticsEvents]: (
      listener: Listener<AnalyticsEvents[K]>
    ) => () => void;
  };
};
