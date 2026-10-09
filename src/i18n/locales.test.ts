import i18next from "i18next";
import { beforeAll, describe, expect, it } from "vitest";
import de from "./locales/de.json";
import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import itLocale from "./locales/it.json";
import nl from "./locales/nl.json";
import pt from "./locales/pt.json";

/**
 * Recursively extracts all nested keys from an object as dot-separated paths.
 * For example, `{ common: { learnMore: "..." } }` yields `["common.learnMore"]`.
 */
function getKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  const keys: string[] = [];

  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      // Narrowed only to `object`; a plain JSON object is safe to read as a record.
      keys.push(...getKeys(value as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }

  return keys.sort((a, b) => a.localeCompare(b));
}

/**
 * i18next plural keys carry a CLDR category suffix (`_one`, `_many`, `_other`).
 * Each language has its own set of categories, so plural keys are compared by
 * their base name for parity, and their suffixes are checked per language.
 */
const PLURAL_SUFFIX_RE = /_(zero|one|two|few|many|other)$/;

const stripPluralSuffix = (key: string): string =>
  key.replace(PLURAL_SUFFIX_RE, "");

const referenceKeys = getKeys(en);

// A key is plural when English defines its `_other` form.
const pluralBaseKeys = referenceKeys
  .filter((key) => key.endsWith("_other"))
  .map(stripPluralSuffix);

// Only English plural keys are collapsed to their base; every other key is
// compared exactly, so renaming `foo` to `foo_one` still fails parity.
const toParityKey = (key: string): string => {
  const base = stripPluralSuffix(key);
  return pluralBaseKeys.includes(base) ? base : key;
};

const getBaseKeys = (keys: string[]): string[] =>
  [...new Set(keys.map(toParityKey))].sort((a, b) => a.localeCompare(b));

const referenceBaseKeys = getBaseKeys(referenceKeys);

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
      const localeBaseKeys = getBaseKeys(getKeys(data));

      const missingKeys = referenceBaseKeys.filter(
        (key) => !localeBaseKeys.includes(key)
      );
      const extraKeys = localeBaseKeys.filter(
        (key) => !referenceBaseKeys.includes(key)
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

      expect(localeBaseKeys).toEqual(referenceBaseKeys);
    });
  }
});

describe("locale plural categories", () => {
  it("English reference has plural keys", () => {
    expect(pluralBaseKeys.length).toBeGreaterThan(0);
  });

  for (const { code, data } of [{ code: "en", data: en }, ...locales]) {
    it(`locale ${code} defines exactly its CLDR plural categories for every plural key`, () => {
      const expected = [
        ...new Intl.PluralRules(code).resolvedOptions().pluralCategories,
      ].sort();
      const localeKeys = getKeys(data);

      for (const base of pluralBaseKeys) {
        const categories = localeKeys
          .filter(
            (key) =>
              PLURAL_SUFFIX_RE.test(key) && stripPluralSuffix(key) === base
          )
          .map((key) => key.slice(base.length + 1))
          .sort();
        expect(categories, `${code} ${base}`).toEqual(expected);
      }
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
      // Narrowed only to `object`; a plain JSON object is safe to read as a record.
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

const referenceKeyValues = getKeyValuePairs(en);

describe("locale interpolation variable parity", () => {
  for (const { code, data } of locales) {
    it(`locale ${code} has matching interpolation variables`, () => {
      const localeKeyValues = getKeyValuePairs(data);
      const errors: string[] = [];

      for (const [key, localeValue] of localeKeyValues) {
        // Plural categories English lacks (e.g. `_many`) are checked against
        // English's `_other` form.
        const enValue =
          referenceKeyValues.get(key) ??
          referenceKeyValues.get(key.replace(PLURAL_SUFFIX_RE, "_other"));
        if (enValue === undefined) {
          continue;
        }

        const enVars = extractInterpolationVars(enValue);
        if (enVars.length === 0) {
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

describe("plural resolution", () => {
  const allLocales = [{ code: "en", data: en }, ...locales];
  const instance = i18next.createInstance();

  beforeAll(async () => {
    await instance.init({
      fallbackLng: "en",
      interpolation: { escapeValue: false },
      resources: Object.fromEntries(
        allLocales.map(({ code, data }) => [code, { translation: data }])
      ),
    });
  });

  const withCount = (template: string, count: number): string =>
    template.replace("{{count}}", String(count));

  it("formats a French percentage with the same spacing as its accuracy label", () => {
    const t = instance.getFixedT("fr");
    const percent = t("common.percent", { percent: 80 });

    expect(percent).toBe("80 %");
    expect(t("session.accuracyAriaLabel", { percent: 80 })).toMatch(
      new RegExp(`${percent}$`)
    );
  });

  for (const { code, data } of allLocales) {
    it(`locale ${code} uses the singular for one result and the plural for several`, () => {
      const t = instance.getFixedT(code);
      const { lookup, spelling } = data.toolbox;

      expect(t("toolbox.lookup.resultCount", { count: 1 })).toBe(
        withCount(lookup.resultCount_one, 1)
      );
      expect(t("toolbox.lookup.resultCount", { count: 2 })).toBe(
        withCount(lookup.resultCount_other, 2)
      );
      expect(t("toolbox.spelling.resultCount", { count: 1 })).toBe(
        withCount(spelling.resultCount_one, 1)
      );
      expect(t("toolbox.spelling.resultCount", { count: 2 })).toBe(
        withCount(spelling.resultCount_other, 2)
      );
    });

    it(`locale ${code} pluralises both numbers of the stay-stack summary`, () => {
      const t = instance.getFixedT(code);
      const { sequences } = data.toolbox;
      const nested = '$t(toolbox.sequences.cycles, {"count": {{cycleCount}} })';
      const expected = (cycleCount: number, cycleLength: number): string => {
        const cycles = withCount(
          cycleCount === 1 ? sequences.cycles_one : sequences.cycles_other,
          cycleCount
        );
        const summary =
          cycleLength === 1 ? sequences.summary_one : sequences.summary_other;
        return withCount(summary.replace(nested, cycles), cycleLength);
      };

      for (const [cycleCount, cycleLength] of [
        [1, 52],
        [2, 26],
        [52, 1],
      ] as const) {
        expect(
          t("toolbox.sequences.summary", { count: cycleLength, cycleCount })
        ).toBe(expected(cycleCount, cycleLength));
      }
    });
  }
});
