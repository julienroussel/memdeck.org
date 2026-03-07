import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "./styles.css";

import { AppShell, ScrollArea } from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { useCallback, useEffect, useRef } from "react";
import { useLocation } from "react-router";
import { ErrorBoundary } from "./components/error-boundary";
import { Header } from "./components/header";
import { NavFooter } from "./components/nav-footer";
import { NavLinks } from "./components/nav-links";
import { useSplashRemoval } from "./hooks/use-splash-removal";
import { Routes } from "./routes";
import { analytics } from "./services/analytics";

const isDesktop = () => window.matchMedia("(min-width: 48em)").matches;

export const App = () => {
  const [opened, { toggle, close, open }] = useDisclosure(isDesktop());
  const desktop = useMediaQuery("(min-width: 48em)");
  const prevDesktopRef = useRef(desktop);

  useEffect(() => {
    if (desktop !== prevDesktopRef.current) {
      prevDesktopRef.current = desktop;
      if (desktop) {
        open();
      } else {
        close();
      }
    }
  }, [desktop, open, close]);

  const closeMobile = useCallback(() => {
    if (!isDesktop()) {
      close();
    }
  }, [close]);
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

  useSplashRemoval();

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 300,
        breakpoint: "sm",
        collapsed: { mobile: !opened, desktop: !opened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Header opened={opened} toggle={toggle} />
      </AppShell.Header>

      <AppShell.Navbar id="main-nav" p="md">
        <AppShell.Section component={ScrollArea} grow>
          <NavLinks onClick={closeMobile} />
        </AppShell.Section>
        <AppShell.Section>
          <NavFooter />
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
