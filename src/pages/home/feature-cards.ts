import {
  IconCards,
  IconChartBar,
  IconTarget,
  IconTools,
} from "@tabler/icons-react";

export const FEATURE_CARDS = [
  {
    titleKey: "home.featureFlashcardTitle",
    descKey: "home.featureFlashcardDescription",
    icon: IconCards,
    color: "blue",
    to: "/flashcard",
    fallbackTo: "/guide",
  },
  {
    titleKey: "home.featureAcaanTitle",
    descKey: "home.featureAcaanDescription",
    icon: IconTarget,
    color: "orange",
    to: "/acaan",
    fallbackTo: "/guide",
  },
  {
    titleKey: "home.featureToolboxTitle",
    descKey: "home.featureToolboxDescription",
    icon: IconTools,
    color: "green",
    to: "/toolbox",
    fallbackTo: "/guide",
  },
  {
    titleKey: "home.featureStatsTitle",
    descKey: "home.featureStatsDescription",
    icon: IconChartBar,
    color: "violet",
    to: "/stats",
    fallbackTo: "/stats",
  },
] as const;
