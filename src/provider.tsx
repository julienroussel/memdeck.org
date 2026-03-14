import type { CSSVariablesResolver } from "@mantine/core";
import {
  Button,
  Center,
  createTheme,
  localStorageColorSchemeManager,
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
import { analytics } from "./services/analytics";

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

const colorSchemeManager = localStorageColorSchemeManager({
  key: "memdeck-app-color-scheme",
});

const theme = createTheme({
  primaryColor: "blue",
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
  primaryShade: 8,
});

const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {},
  light: {
    "--mantine-color-dimmed": "#495057",
  },
  dark: {},
});

const RootErrorFallback = ({ error }: { error: unknown }) => (
  <Center h="100vh" p="md">
    <Stack align="center" gap="md">
      <Title order={2}>Application Error</Title>
      <Text c="dimmed" maw={400} ta="center">
        A critical error occurred. Please refresh the page to continue.
      </Text>
      {import.meta.env.DEV && (
        <Text c="red" ff="monospace" size="sm">
          {error instanceof Error ? error.message : String(error)}
        </Text>
      )}
      <Button onClick={() => window.location.reload()} variant="light">
        Refresh Page
      </Button>
    </Stack>
  </Center>
);

const OuterErrorFallback = ({ error }: { error: unknown }) => (
  <div
    role="alert"
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
      padding: "1rem",
      fontFamily: "system-ui, sans-serif",
      textAlign: "center",
      color: "#212529",
      backgroundColor: "#ffffff",
    }}
  >
    <div>
      <h1 style={{ fontSize: "1.5rem", margin: 0 }}>Application Error</h1>
      <p style={{ color: "#868e96", maxWidth: 400 }}>
        A critical error occurred. Please refresh the page to continue.
      </p>
      {import.meta.env.DEV && (
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
      )}
      <button
        onClick={() => window.location.reload()}
        style={{
          padding: "0.5rem 1rem",
          border: "1px solid #dee2e6",
          borderRadius: 4,
          background: "transparent",
          cursor: "pointer",
          fontSize: "0.875rem",
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

export const Provider = () => {
  return (
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
          <Notifications />
          <LanguageLoadNotifier />
          <PwaUpdateNotifier />
          <BrowserRouter>
            <FocusOnNavigate />
            <App />
          </BrowserRouter>
        </ErrorBoundary>
      </MantineProvider>
    </ErrorBoundary>
  );
};
