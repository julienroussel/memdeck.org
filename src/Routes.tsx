import { Routes as RouterRoutes, Route as RouterRoute } from 'react-router';
import { Flashcard } from './pages/Flashcard';
import { Home } from './pages/Home';
import { Shuffle } from './pages/Shuffle';
import { NextPrevious } from './pages/NextPrevious';
import { Acaan } from './pages/ACANN';

export const Routes = () => (
  <RouterRoutes>
    <RouterRoute path="/" element={<Home />} />
    <RouterRoute path="/flashcard" element={<Flashcard />} />
    <RouterRoute path="/nextprevious" element={<NextPrevious />} />
    <RouterRoute path="/shuffle" element={<Shuffle />} />
    <RouterRoute path="/acaan" element={<Acaan />} />
  </RouterRoutes>
);
