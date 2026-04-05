import { Center, Loader } from "@mantine/core";
import { type ReactNode, Suspense } from "react";
import {
  Navigate,
  Route as RouterRoute,
  Routes as RouterRoutes,
} from "react-router";
import { RequireStack } from "./components/require-stack";
import { ROUTES } from "./constants";
import { lazyWithReload } from "./utils/lazy-with-reload";

const Home = lazyWithReload(() =>
  import("./pages/home/home").then((m) => ({ default: m.Home }))
);
const Guide = lazyWithReload(() =>
  import("./pages/guide/guide").then((m) => ({ default: m.Guide }))
);
const Resources = lazyWithReload(() =>
  import("./pages/resources").then((m) => ({ default: m.Resources }))
);
const Faq = lazyWithReload(() =>
  import("./pages/faq").then((m) => ({ default: m.Faq }))
);
const Flashcard = lazyWithReload(() =>
  import("./pages/flashcard/flashcard").then((m) => ({ default: m.Flashcard }))
);
const SpotCheck = lazyWithReload(() =>
  import("./pages/spot-check/spot-check").then((m) => ({
    default: m.SpotCheck,
  }))
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
      path={ROUTES.home}
    />
    <RouterRoute
      element={
        <LazyRoute>
          <Guide />
        </LazyRoute>
      }
      path={ROUTES.guide}
    />
    <RouterRoute
      element={
        <LazyRoute>
          <Resources />
        </LazyRoute>
      }
      path={ROUTES.resources}
    />
    <RouterRoute
      element={
        <LazyRoute>
          <Faq />
        </LazyRoute>
      }
      path={ROUTES.faq}
    />
    <RouterRoute
      element={
        <LazyRoute>
          <RequireStack descriptionKey="flashcard.pageDescription">
            <Flashcard />
          </RequireStack>
        </LazyRoute>
      }
      path={ROUTES.flashcard}
    />
    <RouterRoute
      element={
        <LazyRoute>
          <RequireStack descriptionKey="spotCheck.pageDescription">
            <SpotCheck />
          </RequireStack>
        </LazyRoute>
      }
      path={ROUTES.spotCheck}
    />
    <RouterRoute
      element={
        <LazyRoute>
          <RequireStack descriptionKey="acaan.pageDescription">
            <Acaan />
          </RequireStack>
        </LazyRoute>
      }
      path={ROUTES.acaan}
    />
    <RouterRoute
      element={
        <LazyRoute>
          <RequireStack descriptionKey="toolbox.pageDescription">
            <Toolbox />
          </RequireStack>
        </LazyRoute>
      }
      path={ROUTES.toolbox}
    />
    <RouterRoute
      element={
        <LazyRoute>
          <Stats />
        </LazyRoute>
      }
      path={ROUTES.stats}
    />
    <RouterRoute
      element={
        <LazyRoute>
          <About />
        </LazyRoute>
      }
      path={ROUTES.about}
    />
    <RouterRoute element={<Navigate replace to={ROUTES.home} />} path="*" />
  </RouterRoutes>
);
