import { useEffect } from "react";

export const useSplashRemoval = (): void => {
  useEffect(() => {
    const splash = document.getElementById("splash");
    if (!splash) {
      return;
    }

    splash.classList.add("splash-hidden");

    const remove = () => splash.remove();
    splash.addEventListener("transitionend", remove, { once: true });

    const fallback = setTimeout(remove, 500);
    return () => {
      clearTimeout(fallback);
      splash.removeEventListener("transitionend", remove);
    };
  }, []);
};
