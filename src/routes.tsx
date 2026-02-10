import { Center, Loader } from "@mantine/core";
import { lazy, type ReactNode, Suspense } from "react";
import {
  Navigate,
  Route as RouterRoute,
  Routes as RouterRoutes,
} from "react-router";
import { RequireStack } from "./components/require-stack";

const Home = lazy(() =>
  import("./pages/home").then((m) => ({ default: m.Home }))
);
const Guide = lazy(() =>
  import("./pages/guide/guide").then((m) => ({ default: m.Guide }))
);
const Resources = lazy(() =>
  import("./pages/resources").then((m) => ({ default: m.Resources }))
);
const Flashcard = lazy(() =>
  import("./pages/flashcard/flashcard").then((m) => ({ default: m.Flashcard }))
);
const Acaan = lazy(() =>
  import("./pages/acaan/acaan").then((m) => ({ default: m.Acaan }))
);
const Toolbox = lazy(() =>
  import("./pages/toolbox").then((m) => ({ default: m.Toolbox }))
);
const Stats = lazy(() =>
  import("./pages/stats/stats").then((m) => ({ default: m.Stats }))
);
const PageLoader = () => (
  <Center h="100%">
    <Loader size="lg" />
  </Center>
);

const LazyRoute = ({ children }: { children: ReactNode }) => (
  <Suspense fallback={<PageLoader />}>{children}</Suspense>
);

export const Routes = () => (
  <RouterRoutes>
    <RouterRoute
      element={
        <LazyRoute>
          <Home />
        </LazyRoute>
      }
      path="/"
    />
    <RouterRoute
      element={
        <LazyRoute>
          <Guide />
        </LazyRoute>
      }
      path="/guide"
    />
    <RouterRoute
      element={
        <LazyRoute>
          <Resources />
        </LazyRoute>
      }
      path="/resources"
    />
    <RouterRoute
      element={
        <LazyRoute>
          <RequireStack>
            <Flashcard />
          </RequireStack>
        </LazyRoute>
      }
      path="/flashcard"
    />
    <RouterRoute
      element={
        <LazyRoute>
          <RequireStack>
            <Acaan />
          </RequireStack>
        </LazyRoute>
      }
      path="/acaan"
    />
    <RouterRoute
      element={
        <LazyRoute>
          <RequireStack>
            <Toolbox />
          </RequireStack>
        </LazyRoute>
      }
      path="/toolbox"
    />
    <RouterRoute
      element={
        <LazyRoute>
          <Stats />
        </LazyRoute>
      }
      path="/stats"
    />
    <RouterRoute element={<Navigate replace to="/" />} path="*" />
  </RouterRoutes>
);
