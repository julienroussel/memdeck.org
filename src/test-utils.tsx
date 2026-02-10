import { MantineProvider } from "@mantine/core";
import {
  type RenderOptions,
  type RenderResult,
  render as rtlRender,
} from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { MemoryRouter } from "react-router";

function AllProviders({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter initialEntries={["/"]}>
      <MantineProvider>{children}</MantineProvider>
    </MemoryRouter>
  );
}

export function render(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
): RenderResult {
  return rtlRender(ui, { wrapper: AllProviders, ...options });
}
