import { useEffect, useRef } from "react";
import { type ROUTES, SITE_URL } from "../constants";

/** Minimal structural constraint for JSON-LD data objects. */
type JsonLdData = Record<string, unknown> & {
  "@context": string;
  "@type": string;
};

/**
 * Injects a JSON-LD structured data script tag into the DOM.
 * Uses useEffect to create the script element, avoiding dangerouslySetInnerHTML.
 * The script is appended inside a hidden container within #root so it is
 * captured by the Playwright-based pre-rendering script.
 *
 * Uses serialized JSON for the dependency check so callers do not need
 * to ensure referential stability of the `data` prop.
 */
export const JsonLd = ({ data }: { data: JsonLdData }) => {
  const ref = useRef<HTMLDivElement>(null);
  // Escape "<" so prerendered HTML (which embeds this via innerHTML) cannot
  // break out of the <script> element (e.g. a "</script>" inside a string).
  // \u003c is a valid JSON escape, so parsers are unaffected.
  const serialized = JSON.stringify(data).replaceAll("<", "\\u003c");

  useEffect(() => {
    const container = ref.current;
    if (!container) {
      return;
    }

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = serialized;
    container.appendChild(script);

    return () => {
      script.remove();
    };
  }, [serialized]);

  return <div hidden ref={ref} />;
};

/**
 * Builds a BreadcrumbList JSON-LD schema for a two-level "Home → <page>"
 * breadcrumb. Centralizes the schema shape so per-page entries only carry
 * the page name and its canonical route.
 */
export const buildBreadcrumbSchema = (
  name: string,
  route: (typeof ROUTES)[keyof typeof ROUTES]
) =>
  ({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${SITE_URL}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name,
        item: `${SITE_URL}${route}`,
      },
    ],
  }) as const;
