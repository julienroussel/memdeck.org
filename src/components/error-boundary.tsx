import { Button, Center, Stack, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";
import { ErrorBoundary as ReactErrorBoundary } from "react-error-boundary";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router";
import { analytics } from "../services/analytics";
import { isStaleChunkError } from "../utils/stale-chunk";

const reloadPage = () => window.location.reload();

const ErrorFallback = ({
  error,
  resetErrorBoundary,
}: {
  error: unknown;
  resetErrorBoundary: () => void;
}) => {
  // React caches a rejected lazy() payload, so resetting would re-render the
  // same failed import. Only a full reload fetches the chunk again.
  const handleTryAgain = isStaleChunkError(error)
    ? reloadPage
    : resetErrorBoundary;
  const { t } = useTranslation();

  return (
    <Center h="100%">
      <Stack align="center" gap="md">
        <Title order={2}>{t("errors.somethingWentWrong")}</Title>
        <Text c="dimmed" maw={400} ta="center">
          {t("errors.unexpectedErrorMessage")}
        </Text>
        {import.meta.env.DEV ? (
          <Text c="red" ff="monospace" size="sm">
            {error instanceof Error ? error.message : String(error)}
          </Text>
        ) : null}
        <Button onClick={handleTryAgain} variant="light">
          {t("errors.tryAgain")}
        </Button>
      </Stack>
    </Center>
  );
};

const handleError = (
  error: unknown,
  info: { componentStack?: string | null }
) => {
  const errorObj = error instanceof Error ? error : new Error(String(error));
  analytics.trackError(errorObj, info.componentStack ?? undefined);
};

export const ErrorBoundary = ({ children }: { children: ReactNode }) => {
  // The navbar sits outside this boundary, so a route change must clear the
  // fallback for the new route to render.
  const { pathname } = useLocation();

  return (
    <ReactErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={handleError}
      resetKeys={[pathname]}
    >
      {children}
    </ReactErrorBoundary>
  );
};
