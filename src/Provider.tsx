import {
  ColorSchemeScript,
  localStorageColorSchemeManager,
  MantineProvider,
} from '@mantine/core';
import { useColorScheme } from '@mantine/hooks';
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
        <App />
      </MantineProvider>
    </>
  );
};
