import { afterEach, describe, expect, it, vi } from "vitest";

const mockInitialize = vi.fn();
const mockSend = vi.fn();
const mockEvent = vi.fn();
const mockOnCLS = vi.fn();
const mockOnINP = vi.fn();
const mockOnLCP = vi.fn();

vi.mock("react-ga4", () => ({
  default: {
    initialize: (id: string) => mockInitialize(id),
    send: (data: unknown) => mockSend(data),
    event: (data: unknown) => mockEvent(data),
  },
}));

vi.mock("web-vitals", () => ({
  onCLS: (callback: unknown) => mockOnCLS(callback),
  onINP: (callback: unknown) => mockOnINP(callback),
  onLCP: (callback: unknown) => mockOnLCP(callback),
}));

const { analytics } = await import("./analytics");

describe("analytics", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("initialize", () => {
    it("initializes ReactGA with tracking ID", () => {
      analytics.initialize();

      expect(mockInitialize).toHaveBeenCalledWith("G-36CZ6GEMKQ");
    });

    it("registers CLS web vital callback", () => {
      analytics.initialize();

      expect(mockOnCLS).toHaveBeenCalledWith(expect.any(Function));
    });

    it("registers INP web vital callback", () => {
      analytics.initialize();

      expect(mockOnINP).toHaveBeenCalledWith(expect.any(Function));
    });

    it("registers LCP web vital callback", () => {
      analytics.initialize();

      expect(mockOnLCP).toHaveBeenCalledWith(expect.any(Function));
    });

    it("registers all web vitals in a single call", () => {
      analytics.initialize();

      expect(mockOnCLS).toHaveBeenCalledTimes(1);
      expect(mockOnINP).toHaveBeenCalledTimes(1);
      expect(mockOnLCP).toHaveBeenCalledTimes(1);
    });
  });

  describe("trackPageView", () => {
    it("sends pageview event with correct path", () => {
      analytics.trackPageView("/home");

      expect(mockSend).toHaveBeenCalledWith({
        hitType: "pageview",
        page: "/home",
      });
    });

    it("sends pageview event for different paths", () => {
      analytics.trackPageView("/flashcard");

      expect(mockSend).toHaveBeenCalledWith({
        hitType: "pageview",
        page: "/flashcard",
      });
    });

    it("handles root path", () => {
      analytics.trackPageView("/");

      expect(mockSend).toHaveBeenCalledWith({
        hitType: "pageview",
        page: "/",
      });
    });

    it("handles paths with query parameters", () => {
      analytics.trackPageView("/page?param=value");

      expect(mockSend).toHaveBeenCalledWith({
        hitType: "pageview",
        page: "/page?param=value",
      });
    });
  });

  describe("trackWebVital (via callbacks)", () => {
    it("sends LCP metric with rounded value", () => {
      analytics.initialize();

      const lcpCallback = mockOnLCP.mock.calls[0][0] as (metric: {
        id: string;
        name: string;
        value: number;
      }) => void;

      lcpCallback({ id: "v1-123", name: "LCP", value: 2534.5 });

      expect(mockSend).toHaveBeenCalledWith({
        eventCategory: "Web Vitals",
        eventAction: "LCP",
        eventValue: 2535,
        eventLabel: "v1-123",
        nonInteraction: true,
      });
    });

    it("sends INP metric with rounded value", () => {
      analytics.initialize();

      const inpCallback = mockOnINP.mock.calls[0][0] as (metric: {
        id: string;
        name: string;
        value: number;
      }) => void;

      inpCallback({ id: "v1-456", name: "INP", value: 128.7 });

      expect(mockSend).toHaveBeenCalledWith({
        eventCategory: "Web Vitals",
        eventAction: "INP",
        eventValue: 129,
        eventLabel: "v1-456",
        nonInteraction: true,
      });
    });

    it("sends CLS metric with value multiplied by 1000", () => {
      analytics.initialize();

      const clsCallback = mockOnCLS.mock.calls[0][0] as (metric: {
        id: string;
        name: string;
        value: number;
      }) => void;

      clsCallback({ id: "v1-789", name: "CLS", value: 0.125 });

      expect(mockSend).toHaveBeenCalledWith({
        eventCategory: "Web Vitals",
        eventAction: "CLS",
        eventValue: 125,
        eventLabel: "v1-789",
        nonInteraction: true,
      });
    });

    it("handles CLS value of 0", () => {
      analytics.initialize();

      const clsCallback = mockOnCLS.mock.calls[0][0] as (metric: {
        id: string;
        name: string;
        value: number;
      }) => void;

      clsCallback({ id: "v1-000", name: "CLS", value: 0 });

      expect(mockSend).toHaveBeenCalledWith({
        eventCategory: "Web Vitals",
        eventAction: "CLS",
        eventValue: 0,
        eventLabel: "v1-000",
        nonInteraction: true,
      });
    });

    it("rounds CLS value correctly", () => {
      analytics.initialize();

      const clsCallback = mockOnCLS.mock.calls[0][0] as (metric: {
        id: string;
        name: string;
        value: number;
      }) => void;

      clsCallback({ id: "v1-abc", name: "CLS", value: 0.0876 });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          eventValue: 88,
        })
      );
    });

    it("handles large LCP values", () => {
      analytics.initialize();

      const lcpCallback = mockOnLCP.mock.calls[0][0] as (metric: {
        id: string;
        name: string;
        value: number;
      }) => void;

      lcpCallback({ id: "v1-large", name: "LCP", value: 10_000.4 });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          eventValue: 10_000,
        })
      );
    });
  });

  describe("trackEvent", () => {
    it("sends custom event with category and action", () => {
      analytics.trackEvent("TestCategory", "TestAction");

      expect(mockEvent).toHaveBeenCalledWith({
        category: "TestCategory",
        action: "TestAction",
        label: undefined,
      });
    });

    it("sends custom event with label", () => {
      analytics.trackEvent("TestCategory", "TestAction", "TestLabel");

      expect(mockEvent).toHaveBeenCalledWith({
        category: "TestCategory",
        action: "TestAction",
        label: "TestLabel",
      });
    });
  });

  describe("trackStackSelected", () => {
    it("sends stack selection event", () => {
      analytics.trackStackSelected("Mnemonica");

      expect(mockEvent).toHaveBeenCalledWith({
        category: "Stack",
        action: "Selected",
        label: "Mnemonica",
      });
    });

    it("handles different stack names", () => {
      analytics.trackStackSelected("Aronson");

      expect(mockEvent).toHaveBeenCalledWith({
        category: "Stack",
        action: "Selected",
        label: "Aronson",
      });
    });
  });

  describe("trackFlashcardAnswer", () => {
    it("sends correct answer event", () => {
      analytics.trackFlashcardAnswer(true, "Mnemonica");

      expect(mockEvent).toHaveBeenCalledWith({
        category: "Flashcard",
        action: "Correct Answer",
        label: "Mnemonica",
      });
    });

    it("sends wrong answer event", () => {
      analytics.trackFlashcardAnswer(false, "Mnemonica");

      expect(mockEvent).toHaveBeenCalledWith({
        category: "Flashcard",
        action: "Wrong Answer",
        label: "Mnemonica",
      });
    });

    it("includes stack name in label", () => {
      analytics.trackFlashcardAnswer(true, "Aronson");

      expect(mockEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          label: "Aronson",
        })
      );
    });
  });

  describe("trackFlashcardModeChanged", () => {
    it("sends mode change event for cardonly", () => {
      analytics.trackFlashcardModeChanged("cardonly");

      expect(mockEvent).toHaveBeenCalledWith({
        category: "Flashcard",
        action: "Mode Changed",
        label: "cardonly",
      });
    });

    it("sends mode change event for indexonly", () => {
      analytics.trackFlashcardModeChanged("indexonly");

      expect(mockEvent).toHaveBeenCalledWith({
        category: "Flashcard",
        action: "Mode Changed",
        label: "indexonly",
      });
    });

    it("sends mode change event for bothmodes", () => {
      analytics.trackFlashcardModeChanged("bothmodes");

      expect(mockEvent).toHaveBeenCalledWith({
        category: "Flashcard",
        action: "Mode Changed",
        label: "bothmodes",
      });
    });
  });

  describe("trackFeatureUsed", () => {
    it("sends feature usage event for ACAAN", () => {
      analytics.trackFeatureUsed("ACAAN");

      expect(mockEvent).toHaveBeenCalledWith({
        category: "Feature",
        action: "Used",
        label: "ACAAN",
      });
    });

    it("sends feature usage event for Shuffle", () => {
      analytics.trackFeatureUsed("Shuffle");

      expect(mockEvent).toHaveBeenCalledWith({
        category: "Feature",
        action: "Used",
        label: "Shuffle",
      });
    });

    it("sends feature usage event for Toolbox", () => {
      analytics.trackFeatureUsed("Toolbox");

      expect(mockEvent).toHaveBeenCalledWith({
        category: "Feature",
        action: "Used",
        label: "Toolbox",
      });
    });
  });

  describe("trackError", () => {
    it("sends error event with error name and message", () => {
      const error = new TypeError("Cannot read property 'foo' of undefined");

      analytics.trackError(error);

      expect(mockEvent).toHaveBeenCalledWith({
        category: "Error",
        action: "TypeError",
        label: "Cannot read property 'foo' of undefined",
      });
    });

    it("sends exception hit type", () => {
      const error = new Error("Test error");

      analytics.trackError(error);

      expect(mockSend).toHaveBeenCalledWith({
        hitType: "exception",
        exDescription: "Error: Test error",
        exFatal: false,
      });
    });

    it("includes component stack in exception description", () => {
      const error = new Error("Component error");
      const componentStack = "at MyComponent (app.tsx:10)";

      analytics.trackError(error, componentStack);

      expect(mockSend).toHaveBeenCalledWith({
        hitType: "exception",
        exDescription: "Error: Component error | at MyComponent (app.tsx:10)",
        exFatal: false,
      });
    });

    it("truncates long component stack to 100 characters", () => {
      const error = new Error("Error");
      const longStack = "a".repeat(200);

      analytics.trackError(error, longStack);

      expect(mockSend).toHaveBeenCalledWith({
        hitType: "exception",
        exDescription: `Error: Error | ${"a".repeat(100)}`,
        exFatal: false,
      });
    });

    it("handles error without component stack", () => {
      const error = new ReferenceError("x is not defined");

      analytics.trackError(error);

      expect(mockEvent).toHaveBeenCalledWith({
        category: "Error",
        action: "ReferenceError",
        label: "x is not defined",
      });
      expect(mockSend).toHaveBeenCalledWith({
        hitType: "exception",
        exDescription: "ReferenceError: x is not defined",
        exFatal: false,
      });
    });
  });
});
