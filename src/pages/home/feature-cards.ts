import {
  IconArrowsRightLeft,
  IconCards,
  IconChartBar,
  IconEyeSearch,
  IconTarget,
  IconTools,
} from "@tabler/icons-react";
import type { ParseKeys } from "i18next";
import { ROUTES } from "../../constants";

type FeatureCard = {
  titleKey: ParseKeys;
  descKey: ParseKeys;
  icon: typeof IconCards;
  color: string;
  to: string;
  fallbackTo: string;
};

export const FEATURE_CARDS = [
  {
    titleKey: "home.featureFlashcardTitle",
    descKey: "home.featureFlashcardDescription",
    icon: IconCards,
    color: "blue",
    to: ROUTES.flashcard,
    fallbackTo: ROUTES.guide,
  },
  {
    titleKey: "home.featureSpotCheckTitle",
    descKey: "home.featureSpotCheckDescription",
    icon: IconEyeSearch,
    color: "cyan",
    to: ROUTES.spotCheck,
    fallbackTo: ROUTES.guide,
  },
  {
    titleKey: "home.featureAcaanTitle",
    descKey: "home.featureAcaanDescription",
    icon: IconTarget,
    color: "orange",
    to: ROUTES.acaan,
    fallbackTo: ROUTES.guide,
  },
  {
    titleKey: "home.featureDistanceTitle",
    descKey: "home.featureDistanceDescription",
    icon: IconArrowsRightLeft,
    color: "yellow",
    to: ROUTES.distance,
    fallbackTo: ROUTES.guide,
  },
  {
    titleKey: "home.featureToolboxTitle",
    descKey: "home.featureToolboxDescription",
    icon: IconTools,
    color: "green",
    to: ROUTES.toolbox,
    fallbackTo: ROUTES.guide,
  },
  {
    titleKey: "home.featureStatsTitle",
    descKey: "home.featureStatsDescription",
    icon: IconChartBar,
    color: "violet",
    to: ROUTES.stats,
    fallbackTo: ROUTES.stats,
  },
] as const satisfies readonly FeatureCard[];
