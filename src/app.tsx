import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "./styles.css";

import { AppShell, ScrollArea } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useEffect } from "react";
import ReactGA from "react-ga4";
import { useLocation } from "react-router";
import { onCLS, onINP, onLCP } from "web-vitals";
import { ErrorBoundary } from "./components/error-boundary";
import { Header } from "./components/header";
import { NavLinks } from "./components/nav-links";
import { StackPicker } from "./components/stack-picker";
import { Routes } from "./routes";

ReactGA.initialize("G-36CZ6GEMKQ");

const sendToGoogleAnalytics = ({
  id,
  name,
  value,
}: {
  id: string;
  name: string;
  value: number;
}) => {
  ReactGA.send({
    eventCategory: "Web Vitals",
    eventAction: name,
    eventValue: Math.round(name === "CLS" ? value * 1000 : value),
    eventLabel: id,
    nonInteraction: true,
  });
};

onCLS(sendToGoogleAnalytics);
onINP(sendToGoogleAnalytics);
onLCP(sendToGoogleAnalytics);

export const App = () => {
  const [opened, { toggle, close }] = useDisclosure();
  const location = useLocation();

  useEffect(() => {
    ReactGA.send({ hitType: "pageview", page: location.pathname });
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
