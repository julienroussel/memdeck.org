import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "./provider";

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <Provider />
    </StrictMode>
  );
}
