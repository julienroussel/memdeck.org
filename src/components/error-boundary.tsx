import { Button, Center, Stack, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";
import { ErrorBoundary as ReactErrorBoundary } from "react-error-boundary";

const ErrorFallback = ({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) => (
  <Center h="100%">
    <Stack align="center" gap="md">
      <Title order={2}>Something went wrong</Title>
      <Text c="dimmed" maw={400} ta="center">
        An unexpected error occurred. Please try again or refresh the page.
      </Text>
      <Text c="red" ff="monospace" size="sm">
        {error.message}
      </Text>
      <Button onClick={resetErrorBoundary} variant="light">
        Try again
      </Button>
    </Stack>
  </Center>
);

export const ErrorBoundary = ({ children }: { children: ReactNode }) => (
  <ReactErrorBoundary FallbackComponent={ErrorFallback}>
    {children}
  </ReactErrorBoundary>
);
