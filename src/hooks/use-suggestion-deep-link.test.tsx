import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, useState } from "react";
import { MemoryRouter, useLocation, useNavigate } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { tryHandler, useSuggestionDeepLink } from "./use-suggestion-deep-link";

// Tiny stand-in enums mirroring real page guards (which take `unknown`).
type Fruit = "apple" | "banana";
const isFruit = (value: unknown): value is Fruit =>
  value === "apple" || value === "banana";
const isBanana = (value: unknown): value is "banana" => value === "banana";

type Options = Parameters<typeof useSuggestionDeepLink>[0];

function DeepLinkProbe({
  options,
  goTo,
  onPending,
}: {
  options: Options;
  goTo?: string;
  onPending?: (pending: boolean) => void;
}) {
  const pending = useSuggestionDeepLink(options);
  // Record every render's value so a test can observe the transient `true`
  // (present while the param is on the URL) before the layout effect strips it
  // and the value settles to `false`.
  onPending?.(pending);
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <output data-testid="loc">{`${pathname}${search}`}</output>
      {goTo !== undefined && (
        <button onClick={() => navigate(goTo)} type="button">
          go
        </button>
      )}
    </>
  );
}

// Mount the probe one commit AFTER the Router so the Router's history listener
// is attached before the hook's layout-effect navigate() fires. This mirrors
// the real app — BrowserRouter lives at the root, mounted long before any page
// (provider.tsx) — and avoids a test-only race where a navigate() issued by a
// co-mounted child is missed because the Router hasn't subscribed yet. Using a
// real router (not a mocked navigate) lets the tests assert the actual URL
// strip and exercise the appliedRef latch via a real effect re-run.
function DeferredMount({
  options,
  goTo,
  onPending,
}: {
  options: Options;
  goTo?: string;
  onPending?: (pending: boolean) => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted ? (
    <DeepLinkProbe goTo={goTo} onPending={onPending} options={options} />
  ) : null;
}

function renderDeepLink(
  initialEntry: string,
  options: Options,
  goTo?: string,
  onPending?: (pending: boolean) => void
) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <DeferredMount goTo={goTo} onPending={onPending} options={options} />
    </MemoryRouter>
  );
}

const currentLocation = () => screen.getByTestId("loc").textContent;

describe("useSuggestionDeepLink", () => {
  it("applies a valid try token via its handler and strips it from the URL", async () => {
    const apply = vi.fn();
    renderDeepLink("/flashcard/?try=apple", {
      tryHandlers: [tryHandler(isFruit, apply)],
    });

    await waitFor(() => expect(currentLocation()).toBe("/flashcard/"));
    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledWith("apple");
  });

  it("ignores an invalid try token but still strips the param", async () => {
    const apply = vi.fn();
    renderDeepLink("/flashcard/?try=garbage", {
      tryHandlers: [tryHandler(isFruit, apply)],
    });

    await waitFor(() => expect(currentLocation()).toBe("/flashcard/"));
    expect(apply).not.toHaveBeenCalled();
  });

  it("applies the first matching handler and skips the rest", async () => {
    // Overlapping guards: isFruit matches "banana" too, so it must win and
    // short-circuit before isBanana — this is what exercises the loop `break`.
    const applyFruit = vi.fn();
    const applyBanana = vi.fn();
    renderDeepLink("/distance/?try=banana", {
      tryHandlers: [
        tryHandler(isFruit, applyFruit),
        tryHandler(isBanana, applyBanana),
      ],
    });

    await waitFor(() => expect(currentLocation()).toBe("/distance/"));
    expect(applyFruit).toHaveBeenCalledWith("banana");
    expect(applyBanana).not.toHaveBeenCalled();
  });

  it("invokes onTimed for ?timed=1 and strips the param", async () => {
    const onTimed = vi.fn();
    renderDeepLink("/acaan/?timed=1", { onTimed });

    await waitFor(() => expect(currentLocation()).toBe("/acaan/"));
    expect(onTimed).toHaveBeenCalledTimes(1);
  });

  it("does not invoke onTimed for a non-enabling timed value but still strips it", async () => {
    const onTimed = vi.fn();
    renderDeepLink("/acaan/?timed=0", { onTimed });

    await waitFor(() => expect(currentLocation()).toBe("/acaan/"));
    expect(onTimed).not.toHaveBeenCalled();
  });

  it("applies both try and timed when present together", async () => {
    const apply = vi.fn();
    const onTimed = vi.fn();
    renderDeepLink("/flashcard/?try=apple&timed=1", {
      onTimed,
      tryHandlers: [tryHandler(isFruit, apply)],
    });

    await waitFor(() => expect(currentLocation()).toBe("/flashcard/"));
    expect(apply).toHaveBeenCalledWith("apple");
    expect(onTimed).toHaveBeenCalledTimes(1);
  });

  it("does nothing and leaves the URL untouched when no params are present", async () => {
    const apply = vi.fn();
    const onTimed = vi.fn();
    renderDeepLink("/flashcard/", {
      onTimed,
      tryHandlers: [tryHandler(isFruit, apply)],
    });

    // The probe rendering means the hook mounted and its layout effect ran.
    await screen.findByTestId("loc");
    expect(currentLocation()).toBe("/flashcard/");
    expect(apply).not.toHaveBeenCalled();
    expect(onTimed).not.toHaveBeenCalled();
  });

  it("strips a try param gracefully on a page that registers no try handlers", async () => {
    // Mirrors ACAAN, which passes only onTimed. A crafted or shared `?try=` URL
    // must still be stripped without applying anything — this exercises the
    // `tryHandlers ?? []` fallback (no handlers to iterate).
    const onTimed = vi.fn();
    renderDeepLink("/acaan/?try=apple", { onTimed });

    await waitFor(() => expect(currentLocation()).toBe("/acaan/"));
    expect(onTimed).not.toHaveBeenCalled();
  });

  it("re-applies a later param-bearing navigation once the prior param was stripped (once-per-appearance)", async () => {
    const apply = vi.fn();
    renderDeepLink(
      "/flashcard/?try=apple",
      { tryHandlers: [tryHandler(isFruit, apply)] },
      "/flashcard/?try=banana"
    );

    // First mount: applies "apple" and strips the param. Stripping returns the
    // URL to a bare pathname, which clears the appliedRef latch.
    await waitFor(() => expect(apply).toHaveBeenNthCalledWith(1, "apple"));
    await waitFor(() => expect(currentLocation()).toBe("/flashcard/"));

    // Navigate to a second param-bearing URL on the SAME mount — this is the
    // post-session "Try it" flow (#698) on a page that itself arrived via a
    // deep-link. The latch reset lets "banana" apply and strip too. We assert on
    // the 2nd apply call because the URL is already "/flashcard/" from the first
    // strip, so a location check alone can't distinguish "re-applied" from
    // "ignored".
    await userEvent.click(screen.getByRole("button", { name: "go" }));
    await waitFor(() => expect(apply).toHaveBeenNthCalledWith(2, "banana"));
    expect(apply).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(currentLocation()).toBe("/flashcard/"));
  });

  // The `pending` return is the contract the mode pages gate their session
  // auto-start on (`autoStart: !pending`), so the single-shot auto-start fires
  // only after the deep-link config has settled — capturing the deep-linked
  // mode/timed in the persisted SessionRecord rather than the page default
  // (#704).
  it("reports pending=true while a try param is on the URL, then false once stripped", async () => {
    const pendings: boolean[] = [];
    const record = (pending: boolean) => pendings.push(pending);
    renderDeepLink(
      "/flashcard/?try=apple",
      { tryHandlers: [tryHandler(isFruit, vi.fn())] },
      undefined,
      record
    );

    await waitFor(() => expect(currentLocation()).toBe("/flashcard/"));
    expect(pendings[0]).toBe(true);
    expect(pendings.at(-1)).toBe(false);
  });

  it("reports pending=true for a ?timed=1 link, then false once stripped", async () => {
    const pendings: boolean[] = [];
    const record = (pending: boolean) => pendings.push(pending);
    renderDeepLink("/acaan/?timed=1", { onTimed: vi.fn() }, undefined, record);

    await waitFor(() => expect(currentLocation()).toBe("/acaan/"));
    expect(pendings[0]).toBe(true);
    expect(pendings.at(-1)).toBe(false);
  });

  it("reports pending=false throughout when no deep-link params are present", async () => {
    const pendings: boolean[] = [];
    const record = (pending: boolean) => pendings.push(pending);
    renderDeepLink(
      "/flashcard/",
      { tryHandlers: [tryHandler(isFruit, vi.fn())] },
      undefined,
      record
    );

    await screen.findByTestId("loc");
    expect(pendings.length).toBeGreaterThan(0);
    expect(pendings.every((pending) => pending === false)).toBe(true);
  });
});
