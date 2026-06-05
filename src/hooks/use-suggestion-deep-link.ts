import { useLayoutEffect, useRef } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";

/**
 * Validates one raw `?try=` value against a page's own enum guard and, when it
 * matches, applies it through the page's existing setter. Returns `true` once
 * it has consumed the value so {@link useSuggestionDeepLink} stops trying the
 * remaining handlers. Pairing the guard with the setter is what keeps the
 * untrusted URL value from being applied blindly — a garbage token matches no
 * handler and is silently dropped.
 */
type TryHandler = (rawValue: string) => boolean;

/**
 * Builds a {@link TryHandler} from a type guard and its matching setter. The
 * generic ties the guard's narrowed type to the setter's parameter, so the only
 * way to construct a handler is with a guard and setter that agree — then the
 * type is erased so handlers for different enums can share one array.
 */
export const tryHandler =
  <T extends string>(
    guard: (value: unknown) => value is T,
    apply: (value: T) => void
  ): TryHandler =>
  (rawValue) => {
    if (guard(rawValue)) {
      apply(rawValue);
      return true;
    }
    return false;
  };

type UseSuggestionDeepLinkOptions = {
  /**
   * Handlers for the `?try=` param, attempted in order until one consumes the
   * value. A page with two preselectable axes (Distance: mode + convention)
   * passes one handler per axis; their value sets are disjoint, so order does
   * not matter.
   */
  tryHandlers?: readonly TryHandler[];
  /** Enables the page's timer; invoked for `?timed=1`. */
  onTimed?: () => void;
};

const TRY_PARAM = "try";
const TIMED_PARAM = "timed";
/** The only value the timed-session suggestions (#697) emit. */
const TIMED_ENABLED_VALUE = "1";

/**
 * Consumes Feature Discovery deep-link params once per param appearance, so a
 * "Try it" tap lands the user already in the suggested mode/variant instead of
 * the page's default. "Once per appearance" (not once per mount): the latch
 * resets when the params clear, so the post-session "Try it" (#698) can re-apply
 * on a page it already arrived at via a deep-link. Reads `?try=` / `?timed=`
 * from the URL, applies each through the
 * page's own guard + existing setter (so the canonical localStorage write and
 * eventBus emit fire), then strips the params with a replace navigation so a
 * refresh or shared link doesn't re-trigger the preselect.
 *
 * Uses `useLayoutEffect`, not `useEffect`: the setter runs and the param is
 * stripped before the browser paints, so the user never sees a frame of the
 * page's default mode. A passive effect would commit one default-mode frame
 * first — the same flicker `use-flashcard-game.ts` avoids with its synchronous
 * in-render reset. The prerender runs the real app in Playwright (not React
 * server rendering), so `useLayoutEffect` raises no SSR warning.
 *
 * @returns Whether a deep-link is still pending — `true` while its params are
 * on the URL, before the layout effect strips them. Callers gate their session
 * auto-start on this so the first (single-shot) auto-start captures the
 * deep-linked config, not the page default (#704).
 */
export const useSuggestionDeepLink = ({
  tryHandlers,
  onTimed,
}: UseSuggestionDeepLinkOptions): boolean => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Latest-ref pattern (as in use-flashcard-game.ts): callers pass fresh inline
  // handlers each render, so reading them through refs keeps the effect's
  // dependency list to the router values only. Application is bounded to once
  // per param appearance by appliedRef, which resets when the params clear.
  const tryHandlersRef = useRef(tryHandlers);
  tryHandlersRef.current = tryHandlers;
  const onTimedRef = useRef(onTimed);
  onTimedRef.current = onTimed;
  const appliedRef = useRef(false);

  useLayoutEffect(() => {
    const tryValue = searchParams.get(TRY_PARAM);
    const timedValue = searchParams.get(TIMED_PARAM);
    if (tryValue === null && timedValue === null) {
      // Nothing to consume. Clear the latch so a *later* param-bearing
      // navigation on the same mount re-applies — the post-session "Try it"
      // (#698) adds a fresh ?try=/?timed= to the page's own route after the page
      // may itself have arrived via a home-card deep-link. A successful apply
      // always strips the params to a bare pathname, so reaching here means the
      // previous deep-link (if any) is fully resolved.
      appliedRef.current = false;
      return;
    }
    if (appliedRef.current) {
      return;
    }
    appliedRef.current = true;

    if (tryValue !== null) {
      for (const handler of tryHandlersRef.current ?? []) {
        if (handler(tryValue)) {
          break;
        }
      }
    }
    if (timedValue === TIMED_ENABLED_VALUE) {
      onTimedRef.current?.();
    }

    // Drop the params so a reload or shared URL doesn't re-apply the preselect.
    // These routes carry no other query params, so replacing with the bare
    // pathname is safe.
    navigate(pathname, { replace: true });
  }, [searchParams, navigate, pathname]);

  // A deep-link is still "pending" while its params are on the URL — the layout
  // effect above strips them once applied. Callers gate their session auto-start
  // on this so the first (single-shot) auto-start captures the deep-linked
  // config, not the page default. (#704)
  return (
    searchParams.get(TRY_PARAM) !== null ||
    searchParams.get(TIMED_PARAM) !== null
  );
};
