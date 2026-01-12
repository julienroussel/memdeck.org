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
};
