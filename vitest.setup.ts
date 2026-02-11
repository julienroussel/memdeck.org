import { cleanup } from "@testing-library/react";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { i18nConfig } from "./src/i18n/config";

i18n
  .use(initReactI18next)
  .init({ ...i18nConfig, initImmediate: false, showSupportNotice: false });

afterEach(() => {
  cleanup();
});
