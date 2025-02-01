import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from './Provider';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider />
  </StrictMode>,
);
