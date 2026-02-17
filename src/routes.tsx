import { Center, Loader } from "@mantine/core";
import { type ReactNode, Suspense } from "react";
import {
  Navigate,
  Route as RouterRoute,
  Routes as RouterRoutes,
} from "react-router";
import { RequireStack } from "./components/require-stack";
import { lazyWithReload } from "./utils/lazy-with-reload";

const Home = lazyWithReload(() =>
  import("./pages/home").then((m) => ({ default: m.Home }))
);
const Guide = lazyWithReload(() =>
  import("./pages/guide/guide").then((m) => ({ default: m.Guide }))
);
const Resources = lazyWithReload(() =>
  import("./pages/resources").then((m) => ({ default: m.Resources }))
);
const Flashcard = lazyWithReload(() =>
  import("./pages/flashcard/flashcard").then((m) => ({ default: m.Flashcard }))
);
const Acaan = lazyWithReload(() =>
  import("./pages/acaan/acaan").then((m) => ({ default: m.Acaan }))
);
const Toolbox = lazyWithReload(() =>
  import("./pages/toolbox/toolbox").then((m) => ({ default: m.Toolbox }))
);
const Stats = lazyWithReload(() =>
  import("./pages/stats/stats").then((m) => ({ default: m.Stats }))
);
const About = lazyWithReload(() =>
  import("./pages/about").then((m) => ({ default: m.About }))
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
    <RouterRoute
      element={
        <LazyRoute>
          <About />
        </LazyRoute>
      }
      path="/about"
    />
    <RouterRoute element={<Navigate replace to="/" />} path="*" />
  </RouterRoutes>
);
