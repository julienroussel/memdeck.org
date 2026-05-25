import { ReactGAImplementation } from "react-ga4";
import { type Metric, onCLS, onINP, onLCP } from "web-vitals";
import type { DistanceConvention, DistanceMode } from "../types/distance";
import type { FlashcardMode, NeighborDirection } from "../types/flashcard";
import type { SessionConfig, TrainingMode } from "../types/session";
import type { SpotCheckMode } from "../types/spot-check";
import type { ShareResult } from "../utils/share";
import { eventBus } from "./event-bus";

const ReactGA = new ReactGAImplementation();

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

// Wrap a subscriber so an exception inside it surfaces through trackError
// without aborting iteration over the remaining listeners (eventBus already
// isolates throws — see event-bus.ts:58 — so the wrap is purely about
// routing the error to telemetry).
//
// Reporting is deferred to a microtask so the throwing listener's stack
// has fully unwound before re-entering analytics machinery. No re-entry
// guard is needed: analytics.trackError calls only ReactGA.event/send
// (no bus emits), and listeners on a single channel are iterated as peers
// — never nested — so the throwing-listener stack is the only reachable
// source of recursion, and it is already unwound by the time the
// microtask runs.
const safeListener =
  <T>(channel: string, fn: (payload: T) => void): ((payload: T) => void) =>
  (payload: T) => {
    try {
      fn(payload);
    } catch (error) {
      queueMicrotask(() =>
        analytics.trackError(
          error instanceof Error ? error : new Error(String(error)),
          `eventBus listener:${channel}`
        )
      );
    }
  };

const subscribeToEvents = () => {
  eventBus.subscribe.STACK_SELECTED(
    safeListener("STACK_SELECTED", ({ stackName }) => {
      analytics.trackStackSelected(stackName);
    })
  );

  eventBus.subscribe.FLASHCARD_ANSWER(
    safeListener("FLASHCARD_ANSWER", ({ correct, stackName }) => {
      analytics.trackFlashcardAnswer(correct, stackName);
    })
  );

  eventBus.subscribe.FLASHCARD_MODE_CHANGED(
    safeListener("FLASHCARD_MODE_CHANGED", ({ mode }) => {
      analytics.trackFlashcardModeChanged(mode);
    })
  );

  eventBus.subscribe.NEIGHBOR_DIRECTION_CHANGED(
    safeListener("NEIGHBOR_DIRECTION_CHANGED", ({ direction }) => {
      analytics.trackNeighborDirectionChanged(direction);
    })
  );

  eventBus.subscribe.ACAAN_ANSWER(
    safeListener("ACAAN_ANSWER", ({ correct, stackName }) => {
      analytics.trackAcaanAnswer(correct, stackName);
    })
  );

  eventBus.subscribe.SPOT_CHECK_ANSWER(
    safeListener("SPOT_CHECK_ANSWER", ({ correct, stackName }) => {
      analytics.trackSpotCheckAnswer(correct, stackName);
    })
  );

  eventBus.subscribe.SPOT_CHECK_MODE_CHANGED(
    safeListener("SPOT_CHECK_MODE_CHANGED", ({ mode }) => {
      analytics.trackSpotCheckModeChanged(mode);
    })
  );

  eventBus.subscribe.DISTANCE_ANSWER(
    safeListener("DISTANCE_ANSWER", ({ correct, stackName }) => {
      analytics.trackDistanceAnswer(correct, stackName);
    })
  );

  eventBus.subscribe.DISTANCE_MODE_CHANGED(
    safeListener("DISTANCE_MODE_CHANGED", ({ mode }) => {
      analytics.trackDistanceModeChanged(mode);
    })
  );

  eventBus.subscribe.DISTANCE_CONVENTION_CHANGED(
    safeListener("DISTANCE_CONVENTION_CHANGED", ({ convention }) => {
      analytics.trackDistanceConventionChanged(convention);
    })
  );

  eventBus.subscribe.SESSION_STARTED(
    safeListener("SESSION_STARTED", ({ mode, config }) => {
      analytics.trackSessionStarted(mode, config);
    })
  );

  eventBus.subscribe.SESSION_COMPLETED(
    safeListener("SESSION_COMPLETED", ({ mode, accuracy, saved }) => {
      analytics.trackSessionCompleted(mode, accuracy, saved);
    })
  );

  eventBus.subscribe.STACK_LIMITS_CHANGED(
    safeListener("STACK_LIMITS_CHANGED", ({ start, end, stackName }) => {
      analytics.trackEvent(
        "Settings",
        "Stack Range Changed",
        `${stackName} (${start}-${end})`
      );
    })
  );
};

// Strips potentially-sensitive substrings from an error message before it is
// forwarded to GA's `label` field. Conservative by design: only collapses
// well-known leak patterns and caps the length — preserves the message body
// when it does not match any pattern so existing taxonomies stay readable.
const ABSOLUTE_PATH_RE = /\/(?:Users|home|var|tmp|private|opt|etc|root)\/\S+/g;
const ERROR_LABEL_MAX_LENGTH = 200;

export const scrubErrorMessage = (message: string): string => {
  // Strip everything after the first newline. V8's JSON.parse SyntaxError
  // appends a snippet of the unparsed input on a new line; this removes it
  // wholesale without needing to enumerate every leak format.
  const firstLine = message.split("\n", 1)[0] ?? "";
  // Replace absolute filesystem paths with a marker so build-machine layouts
  // and user home directories never reach GA.
  const stripped = firstLine.replace(ABSOLUTE_PATH_RE, "[path]");
  if (stripped.length <= ERROR_LABEL_MAX_LENGTH) {
    return stripped;
  }
  return stripped.slice(0, ERROR_LABEL_MAX_LENGTH);
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

  trackDistanceAnswer: (correct: boolean, stackName: string) => {
    if (!isEnabled()) {
      return;
    }
    ReactGA.event({
      category: "Distance",
      action: correct ? "Correct Answer" : "Wrong Answer",
      label: stackName,
    });
  },

  trackDistanceModeChanged: (mode: DistanceMode) => {
    if (!isEnabled()) {
      return;
    }
    ReactGA.event({
      category: "Distance",
      action: "Mode Changed",
      label: mode,
    });
  },

  trackDistanceConventionChanged: (convention: DistanceConvention) => {
    if (!isEnabled()) {
      return;
    }
    ReactGA.event({
      category: "Distance",
      action: "Convention Changed",
      label: convention,
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

  trackSessionCompleted: (
    mode: TrainingMode,
    accuracy: number,
    saved: boolean
  ) => {
    if (!isEnabled()) {
      return;
    }
    ReactGA.event({
      category: "Session",
      action: saved ? "Completed" : "Save Failed",
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
      if (import.meta.env.DEV) {
        console.warn("[analytics.trackError]", componentStack, error);
      }
      return;
    }
    try {
      // Defense-in-depth scrubbing applied to both the `label` and
      // `exDescription` fields. Most callers (`localstorage-telemetry.ts`,
      // `session-breadcrumbs.ts`) already construct controlled messages;
      // this guards against future callers forwarding raw `Error.message`
      // strings — V8 leaks JSON.parse snippets there, and stack traces /
      // absolute paths leak environment info.
      const scrubbedMessage = scrubErrorMessage(error.message);
      ReactGA.event({
        category: "Error",
        action: error.name,
        label: scrubbedMessage,
      });
      ReactGA.send({
        hitType: "exception",
        exDescription: `${error.name}: ${scrubbedMessage}${componentStack ? ` | ${componentStack.slice(0, 100)}` : ""}`,
        exFatal: false,
      });
    } catch {
      // Analytics MUST NOT break user-facing flows.
    }
  },
};
