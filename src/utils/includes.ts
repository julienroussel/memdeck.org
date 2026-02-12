/**
 * Type-safe array inclusion check that narrows the value to a member of the array.
 *
 * Replaces the unsafe `(ARRAY as readonly string[]).includes(value)` pattern
 * by centralizing the single `as readonly unknown[]` cast and providing a
 * type predicate that narrows `value` to `T[number]`.
 */
export const includes = <T extends readonly unknown[]>(
  arr: T,
  value: unknown
): value is T[number] => (arr as readonly unknown[]).includes(value);
