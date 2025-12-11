import { Route as RouterRoute, Routes as RouterRoutes } from "react-router";
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
    <RouterRoute element={<Flashcard />} path="/flashcard" />
    <RouterRoute element={<Shuffle />} path="/shuffle" />
    <RouterRoute element={<Acaan />} path="/acaan" />
    <RouterRoute element={<Toolbox />} path="/toolbox" />
  </RouterRoutes>
);
