import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { languageReady } from "./i18n";
import { Provider } from "./provider";
import { eventBus } from "./services/event-bus";

declare global {
  interface Window {
    __memdeckEventBus?: typeof eventBus;
  }
}

if (new URLSearchParams(window.location.search).has("memdeck-e2e")) {
  window.__memdeckEventBus = eventBus;
}

const rootElement = document.getElementById("root");

if (rootElement) {
  const root = createRoot(rootElement);
  const render = () => {
    root.render(
      <StrictMode>
        <Provider />
      </StrictMode>
    );
  };

  // Wait for the detected locale to load before first render so non-English
  // users never see a flash of English. For English (bundled synchronously)
  // this resolves on the next microtask. On failure, render with fallback.
  languageReady.then(render, render);
}
