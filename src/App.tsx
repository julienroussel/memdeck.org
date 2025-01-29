import '@mantine/core/styles.css';

import { MantineProvider } from '@mantine/core';
import { useState, useMemo, useCallback } from 'react';
import viteLogo from '/vite.svg';
import { Effect } from 'effect';

function App() {
  const [count, setCount] = useState(0);

  const task = useMemo(
    () => Effect.sync(() => setCount((current) => current + 1)),
    [setCount],
  );

  const increment = useCallback(() => Effect.runSync(task), [task]);

  return (
    <MantineProvider>
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
      </div>
      <button onClick={increment}>count is {count}</button>
    </MantineProvider>
  );
}

export default App;
