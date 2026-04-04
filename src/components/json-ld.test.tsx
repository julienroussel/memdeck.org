import { describe, expect, it } from "vitest";
import { render } from "../test-utils";
import { JsonLd } from "./json-ld";

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
