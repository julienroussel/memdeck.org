import { Routes as RouterRoutes, Route as RouterRoute } from 'react-router';
import { Flashcard } from './pages/Flashcard/Flashcard';
import { Home } from './pages/Home';
import { Shuffle } from './pages/Shuffle';
import { Acaan } from './pages/ACAAN';
import { Resources } from './pages/Resources';
import { Toolbox } from './pages/Toolbox';

export const Routes = () => (
  <RouterRoutes>
    <RouterRoute path="/" element={<Home />} />
    <RouterRoute path="/resources" element={<Resources />} />
    <RouterRoute path="/flashcard" element={<Flashcard />} />
    <RouterRoute path="/shuffle" element={<Shuffle />} />
    <RouterRoute path="/acaan" element={<Acaan />} />
    <RouterRoute path="/toolbox" element={<Toolbox />} />
  </RouterRoutes>
);
