import ReactGA from "react-ga4";
import { type Metric, onCLS, onINP, onLCP } from "web-vitals";
import type { FlashcardMode } from "../types/flashcard";
import { eventBus } from "./event-bus";

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
