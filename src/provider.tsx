import {
  Button,
  Center,
  ColorSchemeScript,
  localStorageColorSchemeManager,
  MantineProvider,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useColorScheme } from "@mantine/hooks";
import { Notifications } from "@mantine/notifications";
import { ErrorBoundary } from "react-error-boundary";
import { BrowserRouter } from "react-router";
import { App } from "./app";
import { analytics } from "./services/analytics";

const colorSchemeManager = localStorageColorSchemeManager({
  key: "memdeck-app-color-scheme",
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
  const colorScheme = useColorScheme();

  return (
    <ErrorBoundary
      FallbackComponent={RootErrorFallback}
      onError={handleRootError}
    >
      <ColorSchemeScript defaultColorScheme={colorScheme} />
      <MantineProvider
        colorSchemeManager={colorSchemeManager}
        defaultColorScheme={colorScheme}
      >
        <Notifications />
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </MantineProvider>
    </ErrorBoundary>
  );
};
