import { useEffect } from "react";
import ReactGA from "react-ga4";
import { useLocation } from "react-router";

export const usePageTracking = () => {
  const location = useLocation();

  useEffect(() => {
    console.info("location", location);
    ReactGA.send("pageview");
  }, [location]);
};
