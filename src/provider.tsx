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
      <Text c="red" ff="monospace" size="sm">
        {error instanceof Error ? error.message : String(error)}
      </Text>
      <Button onClick={() => window.location.reload()} variant="light">
        Refresh Page
      </Button>
    </Stack>
  </Center>
);

const handleRootError = (error: unknown) => {
  const errorObj = error instanceof Error ? error : new Error(String(error));
  analytics.trackError(errorObj, "Root");
};

export const Provider = () => {
  return (
    <ErrorBoundary
      FallbackComponent={RootErrorFallback}
      onError={handleRootError}
    >
      <MantineProvider
        colorSchemeManager={colorSchemeManager}
        cssVariablesResolver={cssVariablesResolver}
        defaultColorScheme={systemColorScheme}
        theme={theme}
      >
        <Notifications />
        <LanguageLoadNotifier />
        <PwaUpdateNotifier />
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </MantineProvider>
    </ErrorBoundary>
  );
};
