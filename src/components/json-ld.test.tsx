import { describe, expect, it } from "vitest";
import { ROUTES, SITE_URL } from "../constants";
import { render } from "../test-utils";
import { buildBreadcrumbSchema, JsonLd } from "./json-ld";

const testData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Test Page",
};

describe("JsonLd", () => {
  it("renders a script tag with JSON-LD content", () => {
    const { container } = render(<JsonLd data={testData} />);

    const script = container.querySelector(
      'script[type="application/ld+json"]'
    );
    expect(script).not.toBeNull();
    expect(script?.textContent).toBe(JSON.stringify(testData));
  });

  it("cleans up the script tag on unmount", () => {
    const { container, unmount } = render(<JsonLd data={testData} />);

    expect(
      container.querySelector('script[type="application/ld+json"]')
    ).not.toBeNull();

    unmount();

    expect(
      container.querySelector('script[type="application/ld+json"]')
    ).toBeNull();
  });

  it("updates the script content when data changes", () => {
    const updatedData = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Updated Page",
    };

    const { container, rerender } = render(<JsonLd data={testData} />);

    const script = container.querySelector(
      'script[type="application/ld+json"]'
    );
    expect(script?.textContent).toBe(JSON.stringify(testData));

    rerender(<JsonLd data={updatedData} />);

    const updatedScript = container.querySelector(
      'script[type="application/ld+json"]'
    );
    expect(updatedScript?.textContent).toBe(JSON.stringify(updatedData));
  });
});

describe("buildBreadcrumbSchema", () => {
  it("returns a BreadcrumbList with Home as the first item", () => {
    const schema = buildBreadcrumbSchema("Flashcard", ROUTES.flashcard);
    expect(schema["@context"]).toBe("https://schema.org");
    expect(schema["@type"]).toBe("BreadcrumbList");
    expect(schema.itemListElement[0]).toEqual({
      "@type": "ListItem",
      item: `${SITE_URL}/`,
      name: "Home",
      position: 1,
    });
  });

  it("uses the supplied name and route for the second item", () => {
    const schema = buildBreadcrumbSchema("Flashcard", ROUTES.flashcard);
    expect(schema.itemListElement[1]).toEqual({
      "@type": "ListItem",
      item: `${SITE_URL}${ROUTES.flashcard}`,
      name: "Flashcard",
      position: 2,
    });
  });

  it("preserves the trailing slash on the route URL", () => {
    const schema = buildBreadcrumbSchema("Stats", ROUTES.stats);
    expect(schema.itemListElement[1].item).toBe(`${SITE_URL}/stats/`);
  });
});
