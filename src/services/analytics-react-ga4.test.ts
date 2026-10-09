import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

// Runs against the real react-ga4 (no module mock), so the assertions see what
// actually reaches gtag's `dataLayer` after react-ga4's own `send` routing,
// which drops unsupported hit types with a console warning.

type WebVitalCallback = (metric: {
  id: string;
  name: string;
  value: number;
}) => void;

const webVitalCallbacks = new Map<string, WebVitalCallback>();

vi.mock("web-vitals", () => ({
  onCLS: (callback: WebVitalCallback) => webVitalCallbacks.set("CLS", callback),
  onINP: (callback: WebVitalCallback) => webVitalCallbacks.set("INP", callback),
  onLCP: (callback: WebVitalCallback) => webVitalCallbacks.set("LCP", callback),
}));

const isArrayLike = (value: unknown): value is ArrayLike<unknown> =>
  typeof value === "object" &&
  value !== null &&
  "length" in value &&
  typeof value.length === "number";

// gtag pushes its `arguments` object onto `window.dataLayer`.
const dataLayerCalls = (): unknown[][] => {
  const layer: unknown = Reflect.get(window, "dataLayer");
  if (!Array.isArray(layer)) {
    return [];
  }
  return layer.map((entry: unknown) =>
    isArrayLike(entry) ? Array.from(entry) : []
  );
};

const findEvent = (name: string): unknown =>
  dataLayerCalls().find((call) => call[0] === "event" && call[1] === name)?.[2];

const REACT_GA4_DROP_WARNINGS = [
  "Unsupported send command",
  "Send command doesn't exist",
];

const originalLocation = window.location;

const { analytics } = await import("./analytics");

// react-ga4 warns with these instead of emitting when a `send` hit type is
// unsupported or missing.
const expectNoDroppedHits = (warnSpy: { mock: { calls: unknown[][] } }) => {
  const warnings = warnSpy.mock.calls.map((args) => String(args[0]));
  for (const dropWarning of REACT_GA4_DROP_WARNINGS) {
    expect(warnings.some((warning) => warning.includes(dropWarning))).toBe(
      false
    );
  }
};

// Must run before the describe below initialises the shared module.
describe("analytics with the real react-ga4 before consent", () => {
  afterAll(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
      writable: true,
    });
  });

  it("pushes nothing onto dataLayer for gtag.js to replay later", () => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, hostname: "memdeck.org" },
      writable: true,
    });

    analytics.trackPageView("/");
    analytics.trackEvent("Category", "Action");
    analytics.trackError(new Error("boom"));

    expect(Reflect.get(window, "dataLayer")).toBeUndefined();
  });
});

describe("analytics with the real react-ga4", () => {
  beforeAll(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, hostname: "memdeck.org" },
      writable: true,
    });
    // Keep the test offline: react-ga4 appends the gtag.js <script> to body.
    const appendSpy = vi
      .spyOn(document.body, "appendChild")
      .mockImplementation((node) => node);
    analytics.initialize();
    appendSpy.mockRestore();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
      writable: true,
    });
  });

  it("emits a GA4 exception event carrying the scrubbed message and call-site context", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {
      // Silenced; inspected by expectNoDroppedHits.
    });

    analytics.trackError(
      new Error("Failed at /Users/someone/app.js:1"),
      "key=foo"
    );

    expect(findEvent("exception")).toEqual({
      description: "Error: Failed at [path] | key=foo",
      fatal: false,
    });
    expectNoDroppedHits(warnSpy);
  });

  it("emits web vitals as gtag events", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {
      // Silenced; inspected by expectNoDroppedHits.
    });

    webVitalCallbacks.get("LCP")?.({ id: "v1-1", name: "LCP", value: 2534.5 });

    expect(findEvent("LCP")).toEqual({
      event_category: "Web Vitals",
      event_label: "v1-1",
      non_interaction: true,
      value: 2535,
    });
    expectNoDroppedHits(warnSpy);
  });
});
