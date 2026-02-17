import { describe, expect, it } from "vitest";
import { stacks } from "../../types/stacks";
import { applyFaro } from "./apply-faro";

const deck = stacks.mnemonica.order;

describe("applyFaro", () => {
  it("returns original order when count is 0", () => {
    const result = applyFaro(deck, "out", 0);
    expect(result).toEqual([...deck]);
  });

  it("places top card at position 0 after a single out-faro", () => {
    const result = applyFaro(deck, "out", 1);
    expect(result[0]).toBe(deck[0]);
  });

  it("places bottom half first card at position 1 after a single out-faro", () => {
    const result = applyFaro(deck, "out", 1);
    expect(result[1]).toBe(deck[26]);
  });

  it("places last card at position 51 after a single out-faro", () => {
    const result = applyFaro(deck, "out", 1);
    expect(result[51]).toBe(deck[51]);
  });

  it("places bottom half first card at position 0 after a single in-faro", () => {
    const result = applyFaro(deck, "in", 1);
    expect(result[0]).toBe(deck[26]);
  });

  it("places top card at position 1 after a single in-faro", () => {
    const result = applyFaro(deck, "in", 1);
    expect(result[1]).toBe(deck[0]);
  });

  it("places top half last card at position 51 after a single in-faro", () => {
    const result = applyFaro(deck, "in", 1);
    expect(result[51]).toBe(deck[25]);
  });

  it("restores original order after 8 out-faros", () => {
    const result = applyFaro(deck, "out", 8);
    expect(result).toEqual([...deck]);
  });

  it("does not restore original order after 7 out-faros", () => {
    const result = applyFaro(deck, "out", 7);
    expect(result).not.toEqual([...deck]);
  });

  it("restores original order after 52 in-faros", () => {
    const result = applyFaro(deck, "in", 52);
    expect(result).toEqual([...deck]);
  });

  it("does not restore original order after 51 in-faros", () => {
    const result = applyFaro(deck, "in", 51);
    expect(result).not.toEqual([...deck]);
  });

  it("preserves deck size after a single out-faro", () => {
    const result = applyFaro(deck, "out", 1);
    expect(result).toHaveLength(52);
  });

  it("returns original order when count is negative", () => {
    const result = applyFaro(deck, "out", -1);
    expect(result).toEqual([...deck]);
  });

  it("returns original order when count is NaN", () => {
    const result = applyFaro(deck, "out", Number.NaN);
    expect(result).toEqual([...deck]);
  });

  it("returns original order when count is Infinity", () => {
    const result = applyFaro(deck, "out", Number.POSITIVE_INFINITY);
    expect(result).toEqual([...deck]);
  });

  it("floors fractional count values", () => {
    const resultFractional = applyFaro(deck, "out", 1.9);
    const resultWhole = applyFaro(deck, "out", 1);
    expect(resultFractional).toEqual(resultWhole);
  });

  it("does not mutate the input array", () => {
    const copy = [...deck];
    applyFaro(deck, "out", 3);
    expect([...deck]).toEqual(copy);
  });
});
