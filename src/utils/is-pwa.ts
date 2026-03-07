/** Returns `true` when the app is running in standalone / PWA mode */
export const isPwa = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  const standaloneMedia = window.matchMedia(
    "(display-mode: standalone)"
  ).matches;

  // iOS Safari exposes a non-standard property
  const iosStandalone = "standalone" in navigator && navigator.standalone;

  return standaloneMedia || iosStandalone === true;
};
