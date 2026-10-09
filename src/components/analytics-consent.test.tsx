import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ANALYTICS_CONSENT_LSK } from "../constants";
import { render } from "../test-utils";
import { createMockLocalStorage } from "../test-utils/mock-local-storage";
import { AnalyticsConsent } from "./analytics-consent";

const mockInitialize = vi.fn();
const mockIsAnalyticsHost = vi.fn<() => boolean>();
vi.mock("../services/analytics", () => ({
  analytics: { initialize: () => mockInitialize() },
  isAnalyticsHost: () => mockIsAnalyticsHost(),
}));

const mockHandleWriteFailed = vi.fn();
const mockReportCorruption = vi.fn();
vi.mock("../utils/localstorage-telemetry", () => ({
  handleLocalDbWriteFailed: (...args: unknown[]) =>
    mockHandleWriteFailed(...args),
  reportLocalDbCorruption: (...args: unknown[]) =>
    mockReportCorruption(...args),
}));

let storage: Map<string, string>;
let mockLocalStorage: Storage;

beforeEach(() => {
  ({ mockLocalStorage, storage } = createMockLocalStorage());
  vi.stubGlobal("localStorage", mockLocalStorage);
  // Run the idle callback synchronously so initialisation is observable.
  vi.stubGlobal("requestIdleCallback", (callback: () => void) => {
    callback();
    return 0;
  });
  mockIsAnalyticsHost.mockReturnValue(true);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const acceptButton = () => screen.queryByRole("button", { name: "Allow" });
const declineButton = () => screen.queryByRole("button", { name: "Decline" });

describe("AnalyticsConsent", () => {
  it("renders nothing off the production hostname", () => {
    mockIsAnalyticsHost.mockReturnValue(false);

    render(<AnalyticsConsent />);

    expect(acceptButton()).not.toBeInTheDocument();
    expect(mockInitialize).not.toHaveBeenCalled();
  });

  it("shows the prompt and does not initialise analytics without a stored choice", () => {
    render(<AnalyticsConsent />);

    expect(acceptButton()).toBeInTheDocument();
    expect(declineButton()).toBeInTheDocument();
    expect(mockInitialize).not.toHaveBeenCalled();
  });

  it("persists acceptance and initialises analytics in the same session", async () => {
    const user = userEvent.setup();
    render(<AnalyticsConsent />);

    const button = acceptButton();
    if (!button) {
      throw new Error("accept button missing");
    }
    await user.click(button);

    expect(storage.get(ANALYTICS_CONSENT_LSK)).toBe('"granted"');
    expect(mockInitialize).toHaveBeenCalledTimes(1);
    expect(acceptButton()).not.toBeInTheDocument();
  });

  it("persists a decline, hides the prompt, and keeps analytics off", async () => {
    const user = userEvent.setup();
    render(<AnalyticsConsent />);

    const button = declineButton();
    if (!button) {
      throw new Error("decline button missing");
    }
    await user.click(button);

    expect(storage.get(ANALYTICS_CONSENT_LSK)).toBe('"denied"');
    expect(mockInitialize).not.toHaveBeenCalled();
    expect(declineButton()).not.toBeInTheDocument();
  });

  it("initialises analytics on mount when consent was granted on an earlier visit", () => {
    storage.set(ANALYTICS_CONSENT_LSK, '"granted"');

    render(<AnalyticsConsent />);

    expect(mockInitialize).toHaveBeenCalledTimes(1);
    expect(acceptButton()).not.toBeInTheDocument();
  });

  it("keeps analytics off and the prompt hidden when consent was declined on an earlier visit", () => {
    storage.set(ANALYTICS_CONSENT_LSK, '"denied"');

    render(<AnalyticsConsent />);

    expect(mockInitialize).not.toHaveBeenCalled();
    expect(acceptButton()).not.toBeInTheDocument();
  });

  it("reports a corrupt stored choice and asks again", () => {
    storage.set(ANALYTICS_CONSENT_LSK, '"maybe"');

    render(<AnalyticsConsent />);

    expect(mockReportCorruption).toHaveBeenCalledWith(
      ANALYTICS_CONSENT_LSK,
      "maybe"
    );
    expect(acceptButton()).toBeInTheDocument();
    expect(mockInitialize).not.toHaveBeenCalled();
  });

  it("reports a failed write and does not initialise analytics", async () => {
    const quotaError = new DOMException("quota", "QuotaExceededError");
    vi.spyOn(mockLocalStorage, "setItem").mockImplementation(() => {
      throw quotaError;
    });
    const user = userEvent.setup();
    render(<AnalyticsConsent />);

    const button = acceptButton();
    if (!button) {
      throw new Error("accept button missing");
    }
    await user.click(button);

    expect(mockHandleWriteFailed).toHaveBeenCalledWith(
      ANALYTICS_CONSENT_LSK,
      quotaError
    );
    expect(mockInitialize).not.toHaveBeenCalled();
  });
});
