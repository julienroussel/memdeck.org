import { MantineProvider } from "@mantine/core";
import {
  type RenderOptions,
  type RenderResult,
  render as rtlRender,
} from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";

function AllProviders({ children }: { children: ReactNode }) {
  return <MantineProvider>{children}</MantineProvider>;
}

export function render(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
): RenderResult {
  return rtlRender(ui, { wrapper: AllProviders, ...options });
}
