import { Center, Loader } from "@mantine/core";
import { lazy, Suspense } from "react";
import {
  Navigate,
  Route as RouterRoute,
  Routes as RouterRoutes,
} from "react-router";
import { RequireStack } from "./components/require-stack";

const Home = lazy(() =>
  import("./pages/home").then((m) => ({ default: m.Home }))
);
const Resources = lazy(() =>
  import("./pages/resources").then((m) => ({ default: m.Resources }))
);
const Flashcard = lazy(() =>
  import("./pages/flashcard/flashcard").then((m) => ({ default: m.Flashcard }))
);
const Acaan = lazy(() =>
  import("./pages/acaan").then((m) => ({ default: m.Acaan }))
);
const Toolbox = lazy(() =>
  import("./pages/toolbox").then((m) => ({ default: m.Toolbox }))
);

const PageLoader = () => (
  <Center h="100%">
    <Loader size="lg" />
  </Center>
);

export const Routes = () => (
  <RouterRoutes>
    <RouterRoute
      element={
        <Suspense fallback={<PageLoader />}>
          <Home />
        </Suspense>
      }
      path="/"
    />
    <RouterRoute
      element={
        <Suspense fallback={<PageLoader />}>
          <Resources />
        </Suspense>
      }
      path="/resources"
    />
    <RouterRoute
      element={
        <Suspense fallback={<PageLoader />}>
          <RequireStack>
            <Flashcard />
          </RequireStack>
        </Suspense>
      }
      path="/flashcard"
    />
    <RouterRoute
      element={
        <Suspense fallback={<PageLoader />}>
          <RequireStack>
            <Acaan />
          </RequireStack>
        </Suspense>
      }
      path="/acaan"
    />
    <RouterRoute
      element={
        <Suspense fallback={<PageLoader />}>
          <RequireStack>
            <Toolbox />
          </RequireStack>
        </Suspense>
      }
      path="/toolbox"
    />
    <RouterRoute element={<Navigate replace to="/" />} path="*" />
  </RouterRoutes>
);
