import { DEFAULT_CHOICES_COUNT } from "../constants";
import type { DeckPosition } from "../types/stacks";
import { createDeckPosition, isDeckPosition } from "../types/stacks";

/** Why a typed focus list was refused, with the part of the input to quote back. */
export type FocusPositionsError =
  | { kind: "invalidToken"; token: string }
  | { kind: "outOfRange"; token: string }
  | { kind: "reversedRange"; token: string; fixed: string }
  | { kind: "duplicate"; position: number }
  | { kind: "tooFew"; count: number };

export type FocusPositionsParse =
  | { ok: true; positions: readonly DeckPosition[] }
  | { ok: false; error: FocusPositionsError };

// A single position ("23") or an inclusive range ("28-31", spaces allowed
// around the hyphen). En and em dashes count as the hyphen, so a pasted
// "28–31" parses too.
const TOKEN_RE = /^(?<start>\d+)(?:\s*[-\u2013\u2014]\s*(?<end>\d+))?$/u;

// Shortest run written as a range when formatting: 23, 24 stays as two positions.
const MIN_FORMATTED_RUN = 3;

/**
 * Parses a comma-separated list of positions and ranges, such as
 * `23, 24, 28-31, 42`, into sorted positions. Empty tokens (a trailing comma)
 * are skipped, and an empty input parses to an empty list, which clears the
 * focus. A position listed twice, directly or through overlapping ranges, is
 * refused rather than merged, so a typo does not go unnoticed.
 */
export const parseFocusPositions = (input: string): FocusPositionsParse => {
  const tokens = input
    .split(",")
    .map((token) => token.trim())
    .filter((token) => token !== "");
  if (tokens.length === 0) {
    return { ok: true, positions: [] };
  }
  const seen = new Set<DeckPosition>();
  for (const token of tokens) {
    const groups = TOKEN_RE.exec(token)?.groups;
    const startText = groups?.start;
    if (startText === undefined) {
      return { error: { kind: "invalidToken", token }, ok: false };
    }
    const start = Number(startText);
    const end = Number(groups?.end ?? startText);
    if (!(isDeckPosition(start) && isDeckPosition(end))) {
      return { error: { kind: "outOfRange", token }, ok: false };
    }
    if (start > end) {
      return {
        error: { fixed: `${end}-${start}`, kind: "reversedRange", token },
        ok: false,
      };
    }
    for (let n: number = start; n <= end; n += 1) {
      const position = createDeckPosition(n);
      if (seen.has(position)) {
        return { error: { kind: "duplicate", position }, ok: false };
      }
      seen.add(position);
    }
  }
  // Card-only, index-only and both draw all five choices from the list.
  if (seen.size < DEFAULT_CHOICES_COUNT) {
    return { error: { count: seen.size, kind: "tooFew" }, ok: false };
  }
  return { ok: true, positions: [...seen].sort((a, b) => a - b) };
};

/**
 * Formats sorted positions back into the input syntax, writing runs of three
 * or more as ranges: `[23, 24, 28, 29, 30, 31, 42]` becomes `23, 24, 28-31, 42`.
 * A list `parseFocusPositions` accepts formats to text that parses back to the
 * same positions.
 */
export const formatFocusPositions = (positions: readonly number[]): string => {
  const parts: string[] = [];
  let runStart: number | undefined;
  let runEnd: number | undefined;
  const closeRun = () => {
    if (runStart === undefined || runEnd === undefined) {
      return;
    }
    if (runEnd - runStart + 1 >= MIN_FORMATTED_RUN) {
      parts.push(`${runStart}-${runEnd}`);
      return;
    }
    for (let position = runStart; position <= runEnd; position += 1) {
      parts.push(String(position));
    }
  };
  for (const position of positions) {
    if (runEnd !== undefined && position === runEnd + 1) {
      runEnd = position;
      continue;
    }
    closeRun();
    runStart = position;
    runEnd = position;
  }
  closeRun();
  return parts.join(", ");
};

const isAscendingPositions = (
  value: unknown,
  isAllowedLength: (length: number) => boolean
): value is readonly DeckPosition[] => {
  if (!Array.isArray(value)) {
    return false;
  }
  const items: readonly unknown[] = value;
  if (!isAllowedLength(items.length)) {
    return false;
  }
  let previous = 0;
  for (const item of items) {
    if (!isDeckPosition(item) || item <= previous) {
      return false;
    }
    previous = item;
  }
  return true;
};

/**
 * Type guard for a stored focus list: empty (no focus), or at least
 * `DEFAULT_CHOICES_COUNT` positions in strictly ascending order, which is the
 * only shape `parseFocusPositions` produces.
 */
export const isFocusPositionList = (
  value: unknown
): value is readonly DeckPosition[] =>
  isAscendingPositions(
    value,
    (length) => length === 0 || length >= DEFAULT_CHOICES_COUNT
  );

/**
 * Type guard for the focus list a session record stores: any non-empty list in
 * strictly ascending order. Looser than `isFocusPositionList` on purpose, so a
 * later change to the input rules cannot make saved history unreadable.
 */
export const isRecordedFocusPositions = (
  value: unknown
): value is readonly DeckPosition[] =>
  isAscendingPositions(value, (length) => length > 0);

/** Compares two optional position lists by content. */
export const isSamePositions = (
  a: readonly DeckPosition[] | undefined,
  b: readonly DeckPosition[] | undefined
): boolean =>
  a === b ||
  (a !== undefined &&
    b !== undefined &&
    a.length === b.length &&
    a.every((position, index) => position === b[index]));
