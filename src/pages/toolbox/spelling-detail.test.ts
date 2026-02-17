import { describe, expect, it } from "vitest";
import { stacks } from "../../types/stacks";
import { buildSpellingSteps } from "./spelling-detail";

const stack = stacks.mnemonica.order;

describe("buildSpellingSteps", () => {
  it("returns one step per letter, excluding spaces", () => {
    const steps = buildSpellingSteps("Ace of Hearts", stack);
    const expectedLetters = "AceofHearts".split("");
    expect(steps).toHaveLength(expectedLetters.length);
  });

  it("assigns the correct letter to each step", () => {
    const steps = buildSpellingSteps("Ten", stack);
    expect(steps[0].letter).toBe("T");
    expect(steps[1].letter).toBe("e");
    expect(steps[2].letter).toBe("n");
  });

  it("uses 1-based positions", () => {
    const steps = buildSpellingSteps("AB", stack);
    expect(steps[0].position).toBe(1);
    expect(steps[1].position).toBe(2);
  });

  it("formats key as letter-index", () => {
    const steps = buildSpellingSteps("Hi", stack);
    expect(steps[0].key).toBe("H-0");
    expect(steps[1].key).toBe("i-1");
  });

  it("maps each step card to the corresponding stack position", () => {
    const steps = buildSpellingSteps("ABC", stack);
    expect(steps[0].card).toBe(stack[0]);
    expect(steps[1].card).toBe(stack[1]);
    expect(steps[2].card).toBe(stack[2]);
  });

  it("sets isLast to true only for the final step", () => {
    const steps = buildSpellingSteps("Dog", stack);
    expect(steps[0].isLast).toBe(false);
    expect(steps[1].isLast).toBe(false);
    expect(steps[2].isLast).toBe(true);
  });

  it("returns an empty array for an empty string", () => {
    const steps = buildSpellingSteps("", stack);
    expect(steps).toHaveLength(0);
  });

  it("returns an empty array for a string with only spaces", () => {
    const steps = buildSpellingSteps("   ", stack);
    expect(steps).toHaveLength(0);
  });

  it("returns undefined cards when card name has more letters than stack length", () => {
    const tinyStack = [stack[0], stack[1]] as unknown as typeof stack;
    const steps = buildSpellingSteps("ABCDE", tinyStack);
    expect(steps[0].card).toBe(tinyStack[0]);
    expect(steps[1].card).toBe(tinyStack[1]);
    expect(steps[2].card).toBeUndefined();
    expect(steps[3].card).toBeUndefined();
    expect(steps[4].card).toBeUndefined();
  });
});
