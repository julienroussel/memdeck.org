import { Button, Center, Stack, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";
import { ErrorBoundary as ReactErrorBoundary } from "react-error-boundary";
import { analytics } from "../services/analytics";

const ErrorFallback = ({
  error,
  resetErrorBoundary,
}: {
  error: unknown;
  resetErrorBoundary: () => void;
}) => (
  <Center h="100%">
    <Stack align="center" gap="md">
      <Title order={2}>Something went wrong</Title>
      <Text c="dimmed" maw={400} ta="center">
        An unexpected error occurred. Please try again or refresh the page.
      </Text>
      <Text c="red" ff="monospace" size="sm">
        {error instanceof Error ? error.message : String(error)}
      </Text>
      <Button onClick={resetErrorBoundary} variant="light">
        Try again
      </Button>
    </Stack>
  </Center>
);

const handleError = (
  error: unknown,
  info: { componentStack?: string | null }
) => {
  const errorObj = error instanceof Error ? error : new Error(String(error));
  analytics.trackError(errorObj, info.componentStack ?? undefined);
};

export const ErrorBoundary = ({ children }: { children: ReactNode }) => (
  <ReactErrorBoundary FallbackComponent={ErrorFallback} onError={handleError}>
    {children}
  </ReactErrorBoundary>
);
