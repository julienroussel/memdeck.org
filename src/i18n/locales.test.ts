import { describe, expect, it } from "vitest";
import de from "./locales/de.json";
import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import itLocale from "./locales/it.json";
import nl from "./locales/nl.json";
import pt from "./locales/pt.json";

/**
 * Recursively extracts all nested keys from an object as dot-separated paths.
 * For example, `{ common: { comingSoon: "..." } }` yields `["common.comingSoon"]`.
 */
function getKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  const keys: string[] = [];

  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      keys.push(...getKeys(value as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }

  return keys.sort();
}

const referenceKeys = getKeys(en as Record<string, unknown>);

const locales = [
  { code: "fr", data: fr },
  { code: "es", data: es },
  { code: "de", data: de },
  { code: "it", data: itLocale },
  { code: "nl", data: nl },
  { code: "pt", data: pt },
] as const;

describe("locale key parity", () => {
  it("English reference has keys", () => {
    expect(referenceKeys.length).toBeGreaterThan(0);
  });

  for (const { code, data } of locales) {
    it(`locale ${code} has all keys from English reference`, () => {
      const localeKeys = getKeys(data as Record<string, unknown>);

      const missingKeys = referenceKeys.filter(
        (key) => !localeKeys.includes(key)
      );
      const extraKeys = localeKeys.filter(
        (key) => !referenceKeys.includes(key)
      );

      if (missingKeys.length > 0 || extraKeys.length > 0) {
        const messages: string[] = [];
        if (missingKeys.length > 0) {
          messages.push(
            `Missing keys in ${code}:\n  ${missingKeys.join("\n  ")}`
          );
        }
        if (extraKeys.length > 0) {
          messages.push(`Extra keys in ${code}:\n  ${extraKeys.join("\n  ")}`);
        }
        expect.fail(messages.join("\n\n"));
      }

      expect(localeKeys).toEqual(referenceKeys);
    });
  }
});

/**
 * Extracts all interpolation variables from a string.
 * For example, "Start {{count}} question session" yields ["count"].
 */
function extractInterpolationVars(value: string): string[] {
  const matches = value.match(/\{\{(\w+)\}\}/g);
  if (!matches) {
    return [];
  }
  return matches.map((match) => match.slice(2, -2)).sort();
}

/**
 * Recursively extracts all nested key-value pairs from an object.
 * Keys are dot-separated paths, values are the leaf strings.
 */
function getKeyValuePairs(
  obj: Record<string, unknown>,
  prefix = ""
): Map<string, string> {
  const pairs = new Map<string, string>();

  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];

    if (typeof value === "string") {
      pairs.set(fullKey, value);
    } else if (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value)
    ) {
      const nestedPairs = getKeyValuePairs(
        value as Record<string, unknown>,
        fullKey
      );
      for (const [nestedKey, nestedValue] of nestedPairs) {
        pairs.set(nestedKey, nestedValue);
      }
    }
  }

  return pairs;
}

const referenceKeyValues = getKeyValuePairs(en as Record<string, unknown>);

describe("locale interpolation variable parity", () => {
  for (const { code, data } of locales) {
    it(`locale ${code} has matching interpolation variables`, () => {
      const localeKeyValues = getKeyValuePairs(data as Record<string, unknown>);
      const errors: string[] = [];

      for (const [key, enValue] of referenceKeyValues) {
        const enVars = extractInterpolationVars(enValue);
        if (enVars.length === 0) {
          continue;
        }

        const localeValue = localeKeyValues.get(key);
        if (!localeValue) {
          continue;
        }

        const localeVars = extractInterpolationVars(localeValue);

        if (JSON.stringify(enVars) !== JSON.stringify(localeVars)) {
          errors.push(
            `Key "${key}":\n  Expected: [${enVars.join(", ")}]\n  Actual:   [${localeVars.join(", ")}]`
          );
        }
      }

      if (errors.length > 0) {
        expect.fail(
          `Interpolation variable mismatch in ${code}:\n\n${errors.join("\n\n")}`
        );
      }
    });
  }
});
