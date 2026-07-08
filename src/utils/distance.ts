import type { DistanceConvention } from "../types/distance";
import type { StackLimits } from "../types/stack-limits";
import { createDeckPosition, type DeckPosition } from "../types/stacks";

/**
 * Distance number math, operating on the active deck cycle. The cycle size is
 * `limits.end - limits.start + 1` so the full deck (52 cards) is just the
 * special case of cycleSize = 52. This matches `getNeighborCard` in
 * `src/utils/neighbor.ts`, which wraps within the active range.
 */

/**
 * Returns the distance from `fromZeroBased` to `toZeroBased` under the active
 * deck cycle and the chosen convention.
 *
 * - Both inputs are zero-based stack indices, i.e. `DeckPosition - 1`.
 * - Both must lie within `[limits.start - 1, limits.end - 1]` (this is enforced
 *   upstream by the prompt generator).
 * - Throws when both indices refer to the same card — `0` distance is not a
 *   valid prompt.
 *
 * Cyclic convention returns the forward distance in `1..cycleSize-1`.
 *
 * Signed convention returns the shortest signed offset in
 * `[-floor((N-1)/2), +floor(N/2)]` excluding 0. At exactly half-cycle (only
 * possible when `cycleSize` is even), the tie is broken in favor of `+`.
 */
export const computeDistance = (
  fromZeroBased: number,
  toZeroBased: number,
  convention: DistanceConvention,
  limits: StackLimits
): number => {
  const cycleSize = limits.end - limits.start + 1;
  const a = fromZeroBased - (limits.start - 1);
  const b = toZeroBased - (limits.start - 1);
  const forward = (((b - a) % cycleSize) + cycleSize) % cycleSize;
  if (forward === 0) {
    throw new Error("computeDistance called with same card");
  }
  if (convention === "cyclic") {
    return forward;
  }
  if (forward * 2 === cycleSize) {
    return forward;
  }
  return forward * 2 > cycleSize ? forward - cycleSize : forward;
};

/**
 * Returns the position you land on when applying `offset` to `fromZeroBased`
 * within the active deck cycle. The result always lies inside
 * `[limits.start, limits.end]`.
 */
export const applyOffset = (
  fromZeroBased: number,
  offset: number,
  limits: StackLimits
): { zeroBased: number; index: DeckPosition } => {
  const cycleSize = limits.end - limits.start + 1;
  const a = fromZeroBased - (limits.start - 1);
  const target = (((a + offset) % cycleSize) + cycleSize) % cycleSize;
  const zeroBased = limits.start - 1 + target;
  return { index: createDeckPosition(zeroBased + 1), zeroBased };
};

/**
 * Returns the full set of legal non-zero distance values for the given
 * convention and cycle size. Cardinality is always `cycleSize - 1`.
 */
export const getValidDistanceRange = (
  convention: DistanceConvention,
  cycleSize: number
): readonly number[] => {
  if (convention === "cyclic") {
    return Array.from({ length: cycleSize - 1 }, (_, i) => i + 1);
  }
  const min = -Math.ceil(cycleSize / 2) + 1;
  const max = Math.floor(cycleSize / 2);
  const result: number[] = [];
  for (let n = min; n <= max; n += 1) {
    if (n !== 0) {
      result.push(n);
    }
  }
  return result;
};

/**
 * Picks `count` plausible distractor distances near `answer`, sorted by
 * absolute proximity (ties broken uniformly via Fisher-Yates within each
 * equal-distance bucket). Excludes the answer itself. If the convention's
 * valid range is smaller than `count`, returns whatever is available —
 * callers must pre-check `MIN_DISTANCE_RANGE` to avoid this.
 */
export const pickComputeDistractors = (
  answer: number,
  convention: DistanceConvention,
  cycleSize: number,
  count: number
): number[] => {
  const candidates = getValidDistanceRange(convention, cycleSize).filter(
    (v) => v !== answer
  );
  const buckets = new Map<number, number[]>();
  for (const v of candidates) {
    const d = Math.abs(v - answer);
    const bucket = buckets.get(d);
    if (bucket === undefined) {
      buckets.set(d, [v]);
    } else {
      bucket.push(v);
    }
  }
  const sortedDistances = [...buckets.keys()].sort((a, b) => a - b);
  const result: number[] = [];
  for (const d of sortedDistances) {
    const bucket = buckets.get(d);
    if (bucket === undefined) {
      continue;
    }
    for (let i = bucket.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const a = bucket[i];
      const b = bucket[j];
      if (a !== undefined && b !== undefined) {
        bucket[i] = b;
        bucket[j] = a;
      }
    }
    for (const v of bucket) {
      result.push(v);
      if (result.length === count) {
        return result;
      }
    }
  }
  return result;
};

/**
 * Picks a random valid offset for the convention, excluding 0. Page-level
 * guards ensure `cycleSize >= MIN_DISTANCE_RANGE` before this is called.
 */
export const pickRandomOffset = (
  convention: DistanceConvention,
  cycleSize: number
): number => {
  const valid = getValidDistanceRange(convention, cycleSize);
  const idx = Math.floor(Math.random() * valid.length);
  const value = valid[idx];
  if (value === undefined) {
    throw new Error(`pickRandomOffset: empty range for cycleSize=${cycleSize}`);
  }
  return value;
};
