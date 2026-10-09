import type { Locator } from "@playwright/test";

const TRAILING_COUNT_PATTERN = /(\d+)$/;

/**
 * Reads the number ending a badge's visually hidden sentence, e.g. 5 from
 * "Correct answers: 5". Throws rather than defaulting, so a missing or
 * reworded sentence fails loudly instead of reading as 0.
 */
export async function readCount(sentence: Locator): Promise<number> {
  const text = (await sentence.textContent()) ?? "";
  const match = TRAILING_COUNT_PATTERN.exec(text);
  if (match?.[1] === undefined) {
    throw new Error(`No trailing count in badge sentence "${text}"`);
  }
  return Number(match[1]);
}
