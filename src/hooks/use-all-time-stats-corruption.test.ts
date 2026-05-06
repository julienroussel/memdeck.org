import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

type OnCorrupt = (key: string, error: unknown) => void;

vi.mock("../utils/localstorage", () => ({
  useLocalDb: vi.fn(),
}));

vi.mock("../utils/localstorage-telemetry", () => ({
  reportLocalDbCorruption: vi.fn(),
}));

const { useLocalDb } = await import("../utils/localstorage");
const mockedUseLocalDb = vi.mocked(useLocalDb);

const { reportLocalDbCorruption } = await import(
  "../utils/localstorage-telemetry"
);
const mockedReport = vi.mocked(reportLocalDbCorruption);

const { useAllTimeStats } = await import("./use-all-time-stats");

describe("useAllTimeStats statsStatus", () => {
  it("starts in 'ready' and flips to 'corrupt' while reporting telemetry when useLocalDb invokes onCorrupt", () => {
    let captured: OnCorrupt | undefined;
    mockedUseLocalDb.mockImplementation(
      (_key, defaultValue, _validate, onCorrupt) => {
        captured = onCorrupt;
        return [defaultValue, vi.fn(), vi.fn()];
      }
    );

    const { result } = renderHook(() => useAllTimeStats());

    expect(result.current.statsStatus).toBe("ready");
    expect(mockedReport).not.toHaveBeenCalled();

    const error = new Error("validation failed");
    act(() => {
      captured?.("memdeck-app-all-time-stats", error);
    });

    expect(result.current.statsStatus).toBe("corrupt");
    expect(mockedReport).toHaveBeenCalledWith(
      "memdeck-app-all-time-stats",
      error
    );
  });
});
