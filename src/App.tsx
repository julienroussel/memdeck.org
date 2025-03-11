import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './styles.css';

import { AppShell, ScrollArea } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import ReactGA from 'react-ga4';
import { onCLS, onINP, onLCP } from 'web-vitals';
import { StackPicker } from './components/StackPicker';
import { Routes } from './Routes';
import { Header } from './components/Header';
import { NavLinks } from './components/NavLinks';

ReactGA.initialize('G-36CZ6GEMKQ');

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
    eventCategory: 'Web Vitals',
    eventAction: name,
    eventValue: Math.round(name === 'CLS' ? value * 1000 : value),
    eventLabel: id,
    nonInteraction: true,
  });
};

onCLS(sendToGoogleAnalytics);
onINP(sendToGoogleAnalytics);
onLCP(sendToGoogleAnalytics);

export const App = () => {
  const [opened, { toggle, close }] = useDisclosure();

  return (
    <>
      <AppShell
        header={{ height: 60 }}
        navbar={{
          width: 300,
          breakpoint: 'sm',
          collapsed: { mobile: !opened },
        }}
        padding="md"
      >
        <AppShell.Header>
          <Header opened={opened} toggle={toggle} />
        </AppShell.Header>

        <AppShell.Navbar p="md">
          <AppShell.Section grow component={ScrollArea}>
            <NavLinks onClick={close} />
          </AppShell.Section>
          <AppShell.Section>
            <StackPicker />
          </AppShell.Section>
        </AppShell.Navbar>
        <AppShell.Main>
          <Routes />
        </AppShell.Main>
      </AppShell>
    </>
  );
};
