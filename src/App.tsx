import '@mantine/core/styles.css';

import { MantineProvider, ColorSchemeScript } from '@mantine/core';
import { MemDeckAppShell } from './MemDeckAppShell';

function App() {
  return (
    <>
      <ColorSchemeScript defaultColorScheme="light" />
      <MantineProvider defaultColorScheme="light">
        <MemDeckAppShell />
      </MantineProvider>
    </>
  );
}

export default App;
