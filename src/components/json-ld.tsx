import { useEffect, useRef } from "react";

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
  const serialized = JSON.stringify(data);

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
