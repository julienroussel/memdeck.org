import ReactGA from "react-ga4";
import { onCLS, onINP, onLCP } from "web-vitals";

const TRACKING_ID = "G-36CZ6GEMKQ";

interface WebVitalMetric {
  id: string;
  name: string;
  value: number;
}

const trackWebVital = ({ id, name, value }: WebVitalMetric) => {
  ReactGA.send({
    eventCategory: "Web Vitals",
    eventAction: name,
    eventValue: Math.round(name === "CLS" ? value * 1000 : value),
    eventLabel: id,
    nonInteraction: true,
  });
};

export const analytics = {
  initialize: () => {
    ReactGA.initialize(TRACKING_ID);
    onCLS(trackWebVital);
    onINP(trackWebVital);
    onLCP(trackWebVital);
  },

  trackPageView: (path: string) => {
    ReactGA.send({ hitType: "pageview", page: path });
  },

  trackEvent: (category: string, action: string, label?: string) => {
    ReactGA.event({ category, action, label });
  },

  // Stack selection events
  trackStackSelected: (stackName: string) => {
    ReactGA.event({
      category: "Stack",
      action: "Selected",
      label: stackName,
    });
  },

  // Flashcard game events
  trackFlashcardAnswer: (correct: boolean, stackName: string) => {
    ReactGA.event({
      category: "Flashcard",
      action: correct ? "Correct Answer" : "Wrong Answer",
      label: stackName,
    });
  },

  trackFlashcardModeChanged: (mode: string) => {
    ReactGA.event({
      category: "Flashcard",
      action: "Mode Changed",
      label: mode,
    });
  },

  // Feature usage events
  trackFeatureUsed: (feature: string) => {
    ReactGA.event({
      category: "Feature",
      action: "Used",
      label: feature,
    });
  },

  // Error tracking
  trackError: (error: Error, componentStack?: string) => {
    ReactGA.event({
      category: "Error",
      action: error.name,
      label: error.message,
    });
    // Also send as exception for better GA4 error tracking
    ReactGA.send({
      hitType: "exception",
      exDescription: `${error.name}: ${error.message}${componentStack ? ` | ${componentStack.slice(0, 100)}` : ""}`,
      exFatal: false,
    });
  },
};
