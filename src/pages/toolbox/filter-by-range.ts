import type { StackLimits } from "../../types/stack-limits";

/** Keeps the entries whose 1-based position lies within the inclusive stack range. */
export const filterByRange = <T extends { position: number }>(
  entries: readonly T[],
  limits: StackLimits
): T[] =>
  entries.filter(
    ({ position }) => position >= limits.start && position <= limits.end
  );
