import {
  ColorSchemeScript,
  localStorageColorSchemeManager,
  MantineProvider,
} from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { useColorScheme } from '@mantine/hooks';
import { HashRouter } from 'react-router';
import { App } from './App';

const colorSchemeManager = localStorageColorSchemeManager({
  key: 'memdeck-app-color-scheme',
});

export const Provider = () => {
  const colorScheme = useColorScheme();

  return (
    <>
      <ColorSchemeScript defaultColorScheme={colorScheme} />
      <MantineProvider
        defaultColorScheme={colorScheme}
        colorSchemeManager={colorSchemeManager}
      >
        <Notifications />
        <HashRouter>
          <App />
        </HashRouter>
      </MantineProvider>
    </>
  );
};
