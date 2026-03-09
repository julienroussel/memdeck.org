import ReactGA from "react-ga4";
import { type Metric, onCLS, onINP, onLCP } from "web-vitals";
import type { FlashcardMode, NeighborDirection } from "../types/flashcard";
import type { SessionConfig, TrainingMode } from "../types/session";
import type { SpotCheckMode } from "../types/spot-check";
import type { ShareResult } from "../utils/share";
import { eventBus } from "./event-bus";

type ShareSource = "nav" | "nudge" | "about";

const TRACKING_ID = "G-36CZ6GEMKQ";
const PRODUCTION_HOSTNAME = "memdeck.org";

const isEnabled = () => window.location.hostname === PRODUCTION_HOSTNAME;

const trackWebVital = ({ id, name, value }: Metric) => {
  ReactGA.send({
    eventCategory: "Web Vitals",
    eventAction: name,
    eventValue: Math.round(name === "CLS" ? value * 1000 : value),
    eventLabel: id,
    nonInteraction: true,
  });
};

const formatSessionLabel = (
  mode: TrainingMode,
  config: SessionConfig
): string =>
  config.type === "structured"
    ? `${mode} (${config.totalQuestions}q)`
    : `${mode} (open)`;

const subscribeToEvents = () => {
  eventBus.subscribe.STACK_SELECTED(({ stackName }) => {
    analytics.trackStackSelected(stackName);
  });

  eventBus.subscribe.FLASHCARD_ANSWER(({ correct, stackName }) => {
    analytics.trackFlashcardAnswer(correct, stackName);
  });

  eventBus.subscribe.FLASHCARD_MODE_CHANGED(({ mode }) => {
    analytics.trackFlashcardModeChanged(mode);
  });

  eventBus.subscribe.NEIGHBOR_DIRECTION_CHANGED(({ direction }) => {
    analytics.trackNeighborDirectionChanged(direction);
  });

  eventBus.subscribe.ACAAN_ANSWER(({ correct, stackName }) => {
    analytics.trackAcaanAnswer(correct, stackName);
  });

  eventBus.subscribe.SPOT_CHECK_ANSWER(({ correct, stackName }) => {
    analytics.trackSpotCheckAnswer(correct, stackName);
  });

  eventBus.subscribe.SPOT_CHECK_MODE_CHANGED(({ mode }) => {
    analytics.trackSpotCheckModeChanged(mode);
  });

  eventBus.subscribe.SESSION_STARTED(({ mode, config }) => {
    analytics.trackSessionStarted(mode, config);
  });

  eventBus.subscribe.SESSION_COMPLETED(({ mode, accuracy }) => {
    analytics.trackSessionCompleted(mode, accuracy);
  });

  eventBus.subscribe.STACK_LIMITS_CHANGED(({ start, end, stackName }) => {
    analytics.trackEvent(
      "Settings",
      "Stack Range Changed",
      `${stackName} (${start}-${end})`
    );
  });
};

export const analytics = {
  initialize: () => {
    if (!isEnabled()) {
      return;
    }
    ReactGA.initialize(TRACKING_ID);
    onCLS(trackWebVital);
    onINP(trackWebVital);
    onLCP(trackWebVital);
    subscribeToEvents();
  },

  trackPageView: (path: string) => {
    if (!isEnabled()) {
      return;
    }
    ReactGA.send({ hitType: "pageview", page: path });
  },

  trackEvent: (category: string, action: string, label?: string) => {
    if (!isEnabled()) {
      return;
    }
    ReactGA.event({ category, action, label });
  },

  trackStackSelected: (stackName: string) => {
    if (!isEnabled()) {
      return;
    }
    ReactGA.event({
      category: "Stack",
      action: "Selected",
      label: stackName,
    });
  },

  trackFlashcardAnswer: (correct: boolean, stackName: string) => {
    if (!isEnabled()) {
      return;
    }
    ReactGA.event({
      category: "Flashcard",
      action: correct ? "Correct Answer" : "Wrong Answer",
      label: stackName,
    });
  },

  trackFlashcardModeChanged: (mode: FlashcardMode) => {
    if (!isEnabled()) {
      return;
    }
    ReactGA.event({
      category: "Flashcard",
      action: "Mode Changed",
      label: mode,
    });
  },

  trackNeighborDirectionChanged: (direction: NeighborDirection) => {
    if (!isEnabled()) {
      return;
    }
    ReactGA.event({
      category: "Settings",
      action: "Neighbor Direction Changed",
      label: direction,
    });
  },

  trackAcaanAnswer: (correct: boolean, stackName: string) => {
    if (!isEnabled()) {
      return;
    }
    ReactGA.event({
      category: "ACAAN",
      action: correct ? "Correct Answer" : "Wrong Answer",
      label: stackName,
    });
  },

  trackSpotCheckAnswer: (correct: boolean, stackName: string) => {
    if (!isEnabled()) {
      return;
    }
    ReactGA.event({
      category: "Spot Check",
      action: correct ? "Correct Answer" : "Wrong Answer",
      label: stackName,
    });
  },

  trackSpotCheckModeChanged: (mode: SpotCheckMode) => {
    if (!isEnabled()) {
      return;
    }
    ReactGA.event({
      category: "Spot Check",
      action: "Mode Changed",
      label: mode,
    });
  },

  trackSessionStarted: (mode: TrainingMode, config: SessionConfig) => {
    if (!isEnabled()) {
      return;
    }
    ReactGA.event({
      category: "Session",
      action: "Started",
      label: formatSessionLabel(mode, config),
    });
  },

  trackSessionCompleted: (mode: TrainingMode, accuracy: number) => {
    if (!isEnabled()) {
      return;
    }
    ReactGA.event({
      category: "Session",
      action: "Completed",
      label: mode,
      value: Math.round(accuracy * 100),
    });
  },

  trackFeatureUsed: (feature: string) => {
    if (!isEnabled()) {
      return;
    }
    ReactGA.event({
      category: "Feature",
      action: "Used",
      label: feature,
    });
  },

  trackShareClicked: (source: ShareSource, result: ShareResult) => {
    if (!isEnabled()) {
      return;
    }
    ReactGA.event({
      category: "Share",
      action: "Clicked",
      label: `${source}:${result}`,
    });
  },

  trackShareNudgeDismissed: () => {
    if (!isEnabled()) {
      return;
    }
    ReactGA.event({
      category: "Share",
      action: "Nudge Dismissed",
    });
  },

  trackError: (error: Error, componentStack?: string) => {
    if (!isEnabled()) {
      return;
    }
    ReactGA.event({
      category: "Error",
      action: error.name,
      label: error.message,
    });
    ReactGA.send({
      hitType: "exception",
      exDescription: `${error.name}: ${error.message}${componentStack ? ` | ${componentStack.slice(0, 100)}` : ""}`,
      exFatal: false,
    });
  },
};
