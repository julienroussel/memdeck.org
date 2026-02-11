import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Stack } from "../types/stacks";
import { stacks } from "../types/stacks";
import {
  type ResetGameAction,
  useResetGameOnStackChange,
} from "./use-reset-game-on-stack-change";

const mnemonicaOrder = stacks.mnemonica.order as Stack;
const aronsonOrder = stacks.aronson.order as Stack;
const redfordOrder = stacks.redford.order as Stack;

describe("useResetGameOnStackChange", () => {
  it("does not dispatch on initial render", () => {
    const mockDispatch = vi.fn();

    renderHook(() =>
      useResetGameOnStackChange(mnemonicaOrder, 15, mockDispatch)
    );

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it("dispatches RESET_GAME when stackOrder reference changes", () => {
    const mockDispatch = vi.fn();

    const { rerender } = renderHook(
      ({ stack }: { stack: Stack }) =>
        useResetGameOnStackChange(stack, 15, mockDispatch),
      { initialProps: { stack: mnemonicaOrder } }
    );

    expect(mockDispatch).not.toHaveBeenCalled();

    rerender({ stack: aronsonOrder });

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith({
      type: "RESET_GAME",
      payload: { stackOrder: aronsonOrder, timerDuration: 15 },
    } satisfies ResetGameAction);
  });

  it("does not dispatch on re-render with the same stack reference", () => {
    const mockDispatch = vi.fn();

    const { rerender } = renderHook(() =>
      useResetGameOnStackChange(mnemonicaOrder, 15, mockDispatch)
    );

    expect(mockDispatch).not.toHaveBeenCalled();

    rerender();

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it("includes correct payload with stackOrder and timerDuration", () => {
    const mockDispatch = vi.fn();

    const { rerender } = renderHook(
      ({ stack, duration }: { stack: Stack; duration: number }) =>
        useResetGameOnStackChange(stack, duration, mockDispatch),
      { initialProps: { stack: mnemonicaOrder, duration: 30 } }
    );

    rerender({ stack: aronsonOrder, duration: 30 });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: "RESET_GAME",
      payload: { stackOrder: aronsonOrder, timerDuration: 30 },
    } satisfies ResetGameAction);
  });

  it("updates ref to new stack after dispatching", () => {
    const mockDispatch = vi.fn();

    const { rerender } = renderHook(
      ({ stack }: { stack: Stack }) =>
        useResetGameOnStackChange(stack, 15, mockDispatch),
      { initialProps: { stack: mnemonicaOrder } }
    );

    rerender({ stack: aronsonOrder });
    expect(mockDispatch).toHaveBeenCalledTimes(1);

    rerender({ stack: aronsonOrder });
    expect(mockDispatch).toHaveBeenCalledTimes(1);

    rerender({ stack: redfordOrder });
    expect(mockDispatch).toHaveBeenCalledTimes(2);
    expect(mockDispatch).toHaveBeenLastCalledWith({
      type: "RESET_GAME",
      payload: { stackOrder: redfordOrder, timerDuration: 15 },
    } satisfies ResetGameAction);
  });

  it("does not dispatch when only timerDuration changes", () => {
    const mockDispatch = vi.fn();

    const { rerender } = renderHook(
      ({ duration }: { duration: number }) =>
        useResetGameOnStackChange(mnemonicaOrder, duration, mockDispatch),
      { initialProps: { duration: 15 } }
    );

    expect(mockDispatch).not.toHaveBeenCalled();

    rerender({ duration: 30 });

    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
