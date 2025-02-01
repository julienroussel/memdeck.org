import { useEffect } from 'react';
import { useLocation } from 'react-router';
import ReactGA from 'react-ga4';

export const usePageTracking = () => {
  const location = useLocation();

  useEffect(() => {
    ReactGA.send('pageview');
  }, [location]);
};
