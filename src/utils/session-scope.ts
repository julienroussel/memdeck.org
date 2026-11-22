import type { ActiveSession } from "../types/session";
import type { StackLimits } from "../types/stack-limits";
import {
  DEFAULT_STACK_LIMITS,
  getRangeSize,
  isSameLimits,
} from "../types/stack-limits";
import type { DeckPosition, StackKey } from "../types/stacks";
import { isSamePositions } from "./focus-positions";

/**
 * What a session's questions are drawn from: the stack range (absent for a
 * mode without one, ACAAN) or, for Flashcard only, a focus list that replaces
 * the range while it is set. Never both.
 */
export type SessionScope =
  | { stackLimits: StackLimits | undefined; focusPositions?: undefined }
  | { focusPositions: readonly DeckPosition[]; stackLimits?: undefined };

/** Number of positions a question can be drawn from; a mode without a range uses the full deck. */
export const getScopeSize = (scope: SessionScope): number =>
  scope.focusPositions?.length ??
  getRangeSize(scope.stackLimits ?? DEFAULT_STACK_LIMITS);

/**
 * Whether the session needs no re-snapshot: it already records this scope
 * (compared by content), or it belongs to another stack. A session started on
 * the previous stack is saved after a stack switch, by which time the scope
 * is already the new stack's, so it must keep its own.
 */
export const hasScope = (
  session: ActiveSession,
  stackKey: StackKey,
  scope: SessionScope
): boolean =>
  session.stackKey !== stackKey ||
  (isSameLimits(session.stackLimits, scope.stackLimits) &&
    (session.mode !== "flashcard" ||
      isSamePositions(session.focusPositions, scope.focusPositions)));

/**
 * Returns the session with its scope replaced, or unchanged when it belongs to
 * another stack (see `hasScope`). Only Flashcard records a focus list.
 */
export const withScope = (
  session: ActiveSession,
  stackKey: StackKey,
  scope: SessionScope
): ActiveSession => {
  if (session.stackKey !== stackKey) {
    return session;
  }
  return session.mode === "flashcard"
    ? {
        ...session,
        focusPositions: scope.focusPositions,
        stackLimits: scope.stackLimits,
      }
    : { ...session, stackLimits: scope.stackLimits };
};
