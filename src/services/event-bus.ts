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
  STACK_LIMITS_CHANGED: {
    start: number;
    end: number;
    rangeSize: number;
    stackName: string;
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
  eventNames: readonly [keyof TEvents, ...(keyof TEvents)[]]
): EventBus<TEvents> {
  const emit: Record<string, unknown> = Object.create(null);
  const subscribe: Record<string, unknown> = Object.create(null);

  for (const name of eventNames) {
    const listeners = new Set<Listener<TEvents[typeof name]>>();
    const key = String(name);

    emit[key] = (payload: TEvents[typeof name]) => {
      for (const listener of listeners) {
        listener(payload);
      }
    };

    subscribe[key] = (listener: Listener<TEvents[typeof name]>) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    };
  }

  // `as` justified: emit/subscribe are built dynamically in the loop above, populating
  // every key from eventNames. TypeScript cannot infer the mapped type from imperative
  // construction, so the cast is unavoidable at this boundary.
  return { emit, subscribe } as EventBus<TEvents>;
}

// Event bus with discriminated method access — full type safety through structure
/** Enforces that a readonly tuple contains every key of T (order-independent) */
function allEventNames<T extends Record<string, unknown>>() {
  return <const U extends readonly (keyof T)[]>(
    names: Exclude<keyof T, U[number]> extends never ? U : never
  ) => names;
}

const analyticsEventNames = allEventNames<AnalyticsEvents>()([
  "STACK_SELECTED",
  "FLASHCARD_ANSWER",
  "FLASHCARD_MODE_CHANGED",
  "NEIGHBOR_DIRECTION_CHANGED",
  "ACAAN_ANSWER",
  "SPOT_CHECK_ANSWER",
  "SPOT_CHECK_MODE_CHANGED",
  "SESSION_STARTED",
  "SESSION_COMPLETED",
  "STACK_LIMITS_CHANGED",
]);

export const eventBus = createEventBus<AnalyticsEvents>(analyticsEventNames);
