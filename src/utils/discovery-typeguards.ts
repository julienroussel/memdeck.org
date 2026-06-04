import type { FeatureDiscoveryState } from "../types/discovery";

/** Validates a localStorage-parsed value as a {@link FeatureDiscoveryState}. */
export const isFeatureDiscoveryState = (
  value: unknown
): value is FeatureDiscoveryState => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  if (!("dismissed" in value && "snoozedUntil" in value)) {
    return false;
  }
  return (
    Array.isArray(value.dismissed) &&
    value.dismissed.every((entry: unknown) => typeof entry === "string") &&
    typeof value.snoozedUntil === "number" &&
    Number.isFinite(value.snoozedUntil)
  );
};
