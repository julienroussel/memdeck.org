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
    color: "blue",
    descKey: "home.featureFlashcardDescription",
    fallbackTo: ROUTES.guide,
    icon: IconCards,
    titleKey: "home.featureFlashcardTitle",
    to: ROUTES.flashcard,
  },
  {
    color: "cyan",
    descKey: "home.featureSpotCheckDescription",
    fallbackTo: ROUTES.guide,
    icon: IconEyeSearch,
    titleKey: "home.featureSpotCheckTitle",
    to: ROUTES.spotCheck,
  },
  {
    color: "orange",
    descKey: "home.featureAcaanDescription",
    fallbackTo: ROUTES.guide,
    icon: IconTarget,
    titleKey: "home.featureAcaanTitle",
    to: ROUTES.acaan,
  },
  {
    color: "yellow",
    descKey: "home.featureDistanceDescription",
    fallbackTo: ROUTES.guide,
    icon: IconArrowsRightLeft,
    titleKey: "home.featureDistanceTitle",
    to: ROUTES.distance,
  },
  {
    color: "green",
    descKey: "home.featureToolboxDescription",
    fallbackTo: ROUTES.guide,
    icon: IconTools,
    titleKey: "home.featureToolboxTitle",
    to: ROUTES.toolbox,
  },
  {
    color: "violet",
    descKey: "home.featureStatsDescription",
    fallbackTo: ROUTES.stats,
    icon: IconChartBar,
    titleKey: "home.featureStatsTitle",
    to: ROUTES.stats,
  },
] as const satisfies readonly FeatureCard[];
