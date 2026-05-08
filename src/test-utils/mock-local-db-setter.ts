import { vi } from "vitest";
import type { UseLocalDbSetOptions } from "../utils/localstorage";

/**
 * Mantine-mirroring mock for a `useLocalDb` setter: invokes
 * `options.onSuccess` only when `shouldSucceed()` returns true. State
 * mutation (when provided) is also gated on success — production's
 * `probedSetValue` returns early on `setItem` throw, so the mock must too.
 *
 * The success flag is a closure to keep a single shared `let` flag in scope
 * across all setters within one test file (so a single `mockSetValueSucceeds
 * = false` flips them all together for failure-path tests).
 */
export const createGatedSetterMock = <T>(
  shouldSucceed: () => boolean,
  onSuccessAssign?: (value: T) => void
) =>
  vi.fn((value: T, options?: UseLocalDbSetOptions) => {
    if (shouldSucceed()) {
      onSuccessAssign?.(value);
      options?.onSuccess?.();
    }
  });
