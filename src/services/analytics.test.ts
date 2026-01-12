import { afterEach, describe, expect, it, vi } from "vitest";

const mockInitialize = vi.fn();
const mockSend = vi.fn();
const mockOnCLS = vi.fn();
const mockOnINP = vi.fn();
const mockOnLCP = vi.fn();

vi.mock("react-ga4", () => ({
  default: {
    initialize: (id: string) => mockInitialize(id),
    send: (data: unknown) => mockSend(data),
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
});
