import {
  ColorSchemeScript,
  localStorageColorSchemeManager,
  MantineProvider,
} from "@mantine/core";
import { useColorScheme } from "@mantine/hooks";
import { Notifications } from "@mantine/notifications";
import { HashRouter } from "react-router";
import { App } from "./app";

const colorSchemeManager = localStorageColorSchemeManager({
  key: "memdeck-app-color-scheme",
});

export const Provider = () => {
  const colorScheme = useColorScheme();

  return (
    <>
      <ColorSchemeScript defaultColorScheme={colorScheme} />
      <MantineProvider
        colorSchemeManager={colorSchemeManager}
        defaultColorScheme={colorScheme}
      >
        <Notifications />
        <HashRouter>
          <App />
        </HashRouter>
      </MantineProvider>
    </>
  );
};
