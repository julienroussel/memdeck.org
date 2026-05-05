import { type Dispatch, type SetStateAction, useCallback, useRef } from "react";

/**
 * Computed result of a `setState` updater that may also queue a side-effect
 * payload derived from `prev`. The updater is pure: it returns the next state
 * and an optional payload, never mutates outer variables.
 */
export type ComputedUpdate<S, P> = {
  next: S;
  payload: P | null;
};

/**
 * Shared utility for the "compute next state + optional side-effect payload
 * from previous state" pattern. The updater is pure; the side effect runs
 * AFTER `setState` returns, outside the updater body, so:
 *
 *   - StrictMode's double-invoke of the updater can't fire the side effect
 *     twice (it only fires once, after setState returns).
 *   - React's batching guarantees still apply.
 *   - The pure-updater rule is preserved (updaters must not have observable
 *     side effects).
 *
 * The payload is bridged from the updater to the post-setState code via a
 * ref. This is React's documented escape hatch for the "compute X from prev,
 * then act on X" pattern. The hook keeps the ref local and pinned so call
 * sites don't have to manage it themselves and the timing assumption lives
 * in one well-named place.
 *
 * Usage:
 *   const dispatch = useSetStateWithSideEffect(setStatus, requestFinalization);
 *   dispatch((prev) => ({ next: nextStatus(prev), payload: maybeFinalize(prev) }));
 */
export const useSetStateWithSideEffect = <S, P>(
  setState: Dispatch<SetStateAction<S>>,
  onPayload: (payload: P) => void
): ((compute: (prev: S) => ComputedUpdate<S, P>) => void) => {
  const payloadRef = useRef<P | null>(null);
  return useCallback(
    (compute: (prev: S) => ComputedUpdate<S, P>) => {
      payloadRef.current = null;
      setState((prev) => {
        const { next, payload } = compute(prev);
        payloadRef.current = payload;
        return next;
      });
      const payload = payloadRef.current;
      payloadRef.current = null;
      if (payload !== null) {
        onPayload(payload);
      }
    },
    [setState, onPayload]
  );
};
