import { act, renderHook } from "@testing-library/react";
import { createElement, StrictMode, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { useSetStateWithSideEffect } from "./use-set-state-with-side-effect";

type State = { count: number };

const useHarness = (onPayload: (p: string) => void) => {
  const [state, setState] = useState<State>({ count: 0 });
  const dispatch = useSetStateWithSideEffect(setState, onPayload);
  return { state, dispatch };
};

describe("useSetStateWithSideEffect", () => {
  it("updates state and fires the side effect with the computed payload", () => {
    const onPayload = vi.fn();
    const { result } = renderHook(() => useHarness(onPayload));

    act(() => {
      result.current.dispatch((prev) => ({
        next: { count: prev.count + 1 },
        payload: `was-${prev.count}`,
      }));
    });

    expect(result.current.state.count).toBe(1);
    expect(onPayload).toHaveBeenCalledExactlyOnceWith("was-0");
  });

  it("skips the side effect when payload is null", () => {
    const onPayload = vi.fn();
    const { result } = renderHook(() => useHarness(onPayload));

    act(() => {
      result.current.dispatch((prev) => ({
        next: { count: prev.count + 1 },
        payload: null,
      }));
    });

    expect(result.current.state.count).toBe(1);
    expect(onPayload).not.toHaveBeenCalled();
  });

  it("invokes the side effect synchronously, after the dispatch call", () => {
    const callOrder: string[] = [];
    const onPayload = vi.fn((p: string) => {
      callOrder.push(`payload:${p}`);
    });
    const { result } = renderHook(() => useHarness(onPayload));

    act(() => {
      result.current.dispatch((prev) => ({
        next: { count: prev.count + 1 },
        payload: "fire",
      }));
      callOrder.push("after-dispatch");
    });

    expect(callOrder).toEqual(["payload:fire", "after-dispatch"]);
  });

  it("clears the bridging ref between calls so a prior payload can't leak", () => {
    const onPayload = vi.fn();
    const { result } = renderHook(() => useHarness(onPayload));

    act(() => {
      result.current.dispatch((prev) => ({
        next: { count: prev.count + 1 },
        payload: "first",
      }));
    });
    act(() => {
      result.current.dispatch((prev) => ({
        next: { count: prev.count + 1 },
        payload: null,
      }));
    });

    expect(onPayload).toHaveBeenCalledExactlyOnceWith("first");
    expect(result.current.state.count).toBe(2);
  });

  it("fires the side effect exactly once under StrictMode", () => {
    const onPayload = vi.fn();
    const { result } = renderHook(() => useHarness(onPayload), {
      wrapper: ({ children }) => createElement(StrictMode, null, children),
    });

    act(() => {
      result.current.dispatch((prev) => ({
        next: { count: prev.count + 1 },
        payload: "strict",
      }));
    });

    expect(onPayload).toHaveBeenCalledExactlyOnceWith("strict");
    expect(result.current.state.count).toBe(1);
  });
});
