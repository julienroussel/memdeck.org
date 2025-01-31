import { Routes as RouterRoutes, Route as RouterRoute } from 'react-router';
import { Quiz } from './pages/Quiz';
import { Home } from './pages/Home';

export const Routes = () => (
  <RouterRoutes>
    <RouterRoute path="/" element={<Home />} />
    <RouterRoute path="/quiz" element={<Quiz />} />
  </RouterRoutes>
);
