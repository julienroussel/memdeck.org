import { useEffect, useRef } from "react";
import { useLocation } from "react-router";

export const FocusOnNavigate = () => {
  const { pathname } = useLocation();
  const isFirstRender = useRef(true);

  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname triggers the effect on route change
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const main = document.querySelector("main");
    if (main) {
      main.setAttribute("tabindex", "-1");
      main.focus({ preventScroll: true });
      main.addEventListener("blur", () => main.removeAttribute("tabindex"), {
        once: true,
      });
    }
  }, [pathname]);

  return null;
};
