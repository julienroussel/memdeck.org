import { Route as RouterRoute, Routes as RouterRoutes } from "react-router";
import { RequireStack } from "./components/require-stack";
import { Acaan } from "./pages/acaan";
import { Flashcard } from "./pages/flashcard/flashcard";
import { Home } from "./pages/home";
import { Resources } from "./pages/resources";
import { Shuffle } from "./pages/shuffle";
import { Toolbox } from "./pages/toolbox";

export const Routes = () => (
  <RouterRoutes>
    <RouterRoute element={<Home />} path="/" />
    <RouterRoute element={<Resources />} path="/resources" />
    <RouterRoute
      element={
        <RequireStack>
          <Flashcard />
        </RequireStack>
      }
      path="/flashcard"
    />
    <RouterRoute
      element={
        <RequireStack>
          <Shuffle />
        </RequireStack>
      }
      path="/shuffle"
    />
    <RouterRoute
      element={
        <RequireStack>
          <Acaan />
        </RequireStack>
      }
      path="/acaan"
    />
    <RouterRoute
      element={
        <RequireStack>
          <Toolbox />
        </RequireStack>
      }
      path="/toolbox"
    />
  </RouterRoutes>
);
