import type { FlashcardMode, NeighborDirection } from "../types/flashcard";
import type { SessionConfig, TrainingMode } from "../types/session";
import type { SpotCheckMode } from "../types/spot-check";

type AnalyticsEvents = {
  STACK_SELECTED: { stackName: string };
  FLASHCARD_ANSWER: { correct: boolean; stackName: string };
  FLASHCARD_MODE_CHANGED: { mode: FlashcardMode };
  NEIGHBOR_DIRECTION_CHANGED: { direction: NeighborDirection };
  ACAAN_ANSWER: { correct: boolean; stackName: string };
  SPOT_CHECK_ANSWER: { correct: boolean; stackName: string };
  SPOT_CHECK_MODE_CHANGED: { mode: SpotCheckMode };
  SESSION_STARTED: { mode: TrainingMode; config: SessionConfig };
  SESSION_COMPLETED: {
    mode: TrainingMode;
    accuracy: number;
    questionsCompleted: number;
  };
};

type Listener<T> = (payload: T) => void;

type EventBus<TEvents extends Record<string, unknown>> = {
  emit: { [K in keyof TEvents]: (payload: TEvents[K]) => void };
  subscribe: {
    [K in keyof TEvents]: (listener: Listener<TEvents[K]>) => () => void;
  };
};

/**
 * Creates a type-safe event bus from an events type map.
 * Each key in the map becomes a named channel with `emit` and `subscribe` methods.
 * Channel types are derived from the map values — no manual wiring required.
 */
function createEventBus<TEvents extends Record<string, unknown>>(
  eventNames: ReadonlyArray<keyof TEvents>
): EventBus<TEvents> {
  // Factory pattern: objects are incrementally built in the loop below.
  // The `as` casts are safe because every key from eventNames is populated before the function returns.
  const emit = {} as EventBus<TEvents>["emit"];
  const subscribe = {} as EventBus<TEvents>["subscribe"];

  for (const name of eventNames) {
    const listeners = new Set<Listener<TEvents[typeof name]>>();

    emit[name] = (payload: TEvents[typeof name]) => {
      for (const listener of listeners) {
        listener(payload);
      }
    };

    subscribe[name] = (listener: Listener<TEvents[typeof name]>) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    };
  }

  return { emit, subscribe };
}

// Event bus with discriminated method access — full type safety through structure
export const eventBus = createEventBus<AnalyticsEvents>([
  "STACK_SELECTED",
  "FLASHCARD_ANSWER",
  "FLASHCARD_MODE_CHANGED",
  "NEIGHBOR_DIRECTION_CHANGED",
  "ACAAN_ANSWER",
  "SPOT_CHECK_ANSWER",
  "SPOT_CHECK_MODE_CHANGED",
  "SESSION_STARTED",
  "SESSION_COMPLETED",
]);
