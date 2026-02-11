import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "./styles.css";

import { AppShell, ScrollArea } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useEffect, useRef } from "react";
import { useLocation } from "react-router";
import { ErrorBoundary } from "./components/error-boundary";
import { Header } from "./components/header";
import { NavLinks } from "./components/nav-links";
import { StackPicker } from "./components/stack-picker";
import { Routes } from "./routes";
import { analytics } from "./services/analytics";

export const App = () => {
  const [opened, { toggle, close }] = useDisclosure();
  const location = useLocation();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) {
      return;
    }
    initializedRef.current = true;
    if ("requestIdleCallback" in window) {
      requestIdleCallback(() => analytics.initialize());
    } else {
      setTimeout(() => analytics.initialize(), 1);
    }
  }, []);

  useEffect(() => {
    analytics.trackPageView(location.pathname);
  }, [location.pathname]);

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 300,
        breakpoint: "sm",
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Header opened={opened} toggle={toggle} />
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <AppShell.Section component={ScrollArea} grow>
          <NavLinks onClick={close} />
        </AppShell.Section>
        <AppShell.Section>
          <StackPicker />
        </AppShell.Section>
      </AppShell.Navbar>
      <AppShell.Main>
        <ErrorBoundary>
          <Routes />
        </ErrorBoundary>
      </AppShell.Main>
    </AppShell>
  );
};
