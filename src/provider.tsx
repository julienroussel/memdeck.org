import type { CSSVariablesResolver } from "@mantine/core";
import {
  Button,
  Center,
  createTheme,
  MantineProvider,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { ErrorBoundary } from "react-error-boundary";
import { BrowserRouter } from "react-router";
import { App } from "./app";
import { FocusOnNavigate } from "./components/focus-on-navigate";
import { LanguageLoadNotifier } from "./components/language-load-notifier";
import { PwaUpdateNotifier } from "./components/pwa-update-notifier";
import { COLOR_SCHEME_LSK } from "./constants";
import { analytics } from "./services/analytics";
import { createColorSchemeManager } from "./utils/color-scheme-manager";

const getSystemColorScheme = (): "light" | "dark" => {
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }
  return "light";
};

const systemColorScheme = getSystemColorScheme();

const colorSchemeManager = createColorSchemeManager(COLOR_SCHEME_LSK);

const theme = createTheme({
  colors: {
    blue: [
      "#e7f5ff",
      "#d0ebff",
      "#a5d8ff",
      "#74c0fc",
      "#4dabf7",
      "#339af0",
      "#228be6",
      "#1c7ed6",
      "#1971c2",
      "#1864ab",
    ],
  },
  primaryColor: "blue",
  primaryShade: 8,
});

const cssVariablesResolver: CSSVariablesResolver = () => ({
  dark: {},
  light: {
    "--mantine-color-dimmed": "#495057",
  },
  variables: {},
});

const reloadPage = () => window.location.reload();

const RootErrorFallback = ({ error }: { error: unknown }) => (
  <Center h="100vh" p="md">
    <Stack align="center" gap="md">
      <Title order={2}>Application Error</Title>
      <Text c="dimmed" maw={400} ta="center">
        A critical error occurred. Please refresh the page to continue.
      </Text>
      {import.meta.env.DEV ? (
        <Text c="red" ff="monospace" size="sm">
          {error instanceof Error ? error.message : String(error)}
        </Text>
      ) : null}
      <Button onClick={reloadPage} variant="light">
        Refresh Page
      </Button>
    </Stack>
  </Center>
);

const OuterErrorFallback = ({ error }: { error: unknown }) => (
  <div
    role="alert"
    style={{
      alignItems: "center",
      backgroundColor: "#ffffff",
      color: "#212529",
      display: "flex",
      fontFamily: "system-ui, sans-serif",
      height: "100vh",
      justifyContent: "center",
      padding: "1rem",
      textAlign: "center",
    }}
  >
    <div>
      <h1 style={{ fontSize: "1.5rem", margin: 0 }}>Application Error</h1>
      <p style={{ color: "#868e96", maxWidth: 400 }}>
        A critical error occurred. Please refresh the page to continue.
      </p>
      {import.meta.env.DEV ? (
        <pre
          style={{
            color: "#c92a2a",
            fontFamily: "monospace",
            fontSize: "0.8rem",
            maxWidth: 500,
            overflow: "auto",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {error instanceof Error ? error.message : String(error)}
        </pre>
      ) : null}
      <button
        onClick={reloadPage}
        style={{
          background: "transparent",
          border: "1px solid #dee2e6",
          borderRadius: 4,
          cursor: "pointer",
          fontSize: "0.875rem",
          padding: "0.5rem 1rem",
        }}
        type="button"
      >
        Refresh Page
      </button>
    </div>
  </div>
);

const handleOuterError = (error: unknown) => {
  const errorObj = error instanceof Error ? error : new Error(String(error));
  analytics.trackError(errorObj, "OuterBoundary");
};

const handleRootError = (error: unknown) => {
  const errorObj = error instanceof Error ? error : new Error(String(error));
  analytics.trackError(errorObj, "Root");
};

export const Provider = () => (
  <ErrorBoundary
    FallbackComponent={OuterErrorFallback}
    onError={handleOuterError}
  >
    <MantineProvider
      colorSchemeManager={colorSchemeManager}
      cssVariablesResolver={cssVariablesResolver}
      defaultColorScheme={systemColorScheme}
      theme={theme}
    >
      <ErrorBoundary
        FallbackComponent={RootErrorFallback}
        onError={handleRootError}
      >
        <LanguageLoadNotifier />
        <PwaUpdateNotifier />
        <BrowserRouter>
          {/* Inside the router so toast messages can render react-router <Link>s
              (e.g. the PWA update toast's "See What's New" link). Mantine portals
              to a fixed DOM target regardless of React-tree position. */}
          <Notifications />
          <FocusOnNavigate />
          <App />
        </BrowserRouter>
      </ErrorBoundary>
    </MantineProvider>
  </ErrorBoundary>
);
