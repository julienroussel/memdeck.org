import {
  IconArrowsRightLeft,
  IconCards,
  IconEyeSearch,
  IconTarget,
} from "@tabler/icons-react";
import { ROUTES } from "../constants";
import type { FeatureSuggestion } from "../types/discovery";

/**
 * Ordered catalog of discoverable features. Whole modes (priority 1) outrank
 * sub-variants (priority 2); within a priority, earlier entries win ties. The
 * hook applies a per-user boost so variants of the most-used mode surface first.
 * Mode + variant items only; "try a timed session" items arrive in #697.
 */
export const SUGGESTION_CATALOG: readonly FeatureSuggestion[] = [
  // Untried whole modes — no deepLink, the card just navigates to the mode.
  {
    id: "mode-spotcheck",
    mode: "spotcheck",
    isUsed: (u) => u.modes.spotcheck,
    isApplicable: () => true,
    priority: 1,
    route: ROUTES.spotCheck,
    icon: IconEyeSearch,
    i18n: { titleKey: "discovery.spotCheckTitle" },
  },
  {
    id: "mode-distance",
    mode: "distance",
    isUsed: (u) => u.modes.distance,
    isApplicable: () => true,
    priority: 1,
    route: ROUTES.distance,
    icon: IconArrowsRightLeft,
    i18n: { titleKey: "discovery.distanceTitle" },
  },
  {
    id: "mode-acaan",
    mode: "acaan",
    isUsed: (u) => u.modes.acaan,
    isApplicable: () => true,
    priority: 1,
    route: ROUTES.acaan,
    icon: IconTarget,
    i18n: { titleKey: "discovery.acaanTitle" },
  },
  // Untried sub-variants — applicable only once the parent mode has been tried.
  {
    id: "flashcard-numberonly",
    mode: "flashcard",
    isUsed: (u) => u.flashcardModes.numberonly,
    isApplicable: (u) => u.modes.flashcard,
    priority: 2,
    route: ROUTES.flashcard,
    deepLink: { param: "try", value: "numberonly" },
    icon: IconCards,
    i18n: { titleKey: "discovery.flashcardNumberOnlyTitle" },
  },
  {
    id: "flashcard-neighbor",
    mode: "flashcard",
    isUsed: (u) => u.flashcardModes.neighbor,
    isApplicable: (u) => u.modes.flashcard,
    priority: 2,
    route: ROUTES.flashcard,
    deepLink: { param: "try", value: "neighbor" },
    icon: IconCards,
    i18n: { titleKey: "discovery.flashcardNeighborTitle" },
  },
  {
    id: "spotcheck-swapped",
    mode: "spotcheck",
    isUsed: (u) => u.spotCheckModes.swapped,
    isApplicable: (u) => u.modes.spotcheck,
    priority: 2,
    route: ROUTES.spotCheck,
    deepLink: { param: "try", value: "swapped" },
    icon: IconEyeSearch,
    i18n: { titleKey: "discovery.spotCheckSwappedTitle" },
  },
  {
    id: "spotcheck-moved",
    mode: "spotcheck",
    isUsed: (u) => u.spotCheckModes.moved,
    isApplicable: (u) => u.modes.spotcheck,
    priority: 2,
    route: ROUTES.spotCheck,
    deepLink: { param: "try", value: "moved" },
    icon: IconEyeSearch,
    i18n: { titleKey: "discovery.spotCheckMovedTitle" },
  },
  {
    id: "distance-apply",
    mode: "distance",
    isUsed: (u) => u.distanceModes.apply,
    isApplicable: (u) => u.modes.distance,
    priority: 2,
    route: ROUTES.distance,
    deepLink: { param: "try", value: "apply" },
    icon: IconArrowsRightLeft,
    i18n: { titleKey: "discovery.distanceApplyTitle" },
  },
  {
    id: "distance-signed",
    mode: "distance",
    isUsed: (u) => u.distanceConventions.signed,
    isApplicable: (u) => u.modes.distance,
    priority: 2,
    route: ROUTES.distance,
    deepLink: { param: "try", value: "signed" },
    icon: IconArrowsRightLeft,
    i18n: { titleKey: "discovery.distanceSignedTitle" },
  },
];

/** Fixed full-catalog size — the monotonic denominator for the progress hint. */
export const TOTAL_SUGGESTIONS = SUGGESTION_CATALOG.length;
