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

function DeepLinkProbe({ options, goTo }: { options: Options; goTo?: string }) {
  useSuggestionDeepLink(options);
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
function DeferredMount({ options, goTo }: { options: Options; goTo?: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted ? <DeepLinkProbe goTo={goTo} options={options} /> : null;
}

function renderDeepLink(initialEntry: string, options: Options, goTo?: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <DeferredMount goTo={goTo} options={options} />
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
      tryHandlers: [tryHandler(isFruit, apply)],
      onTimed,
    });

    await waitFor(() => expect(currentLocation()).toBe("/flashcard/"));
    expect(apply).toHaveBeenCalledWith("apple");
    expect(onTimed).toHaveBeenCalledTimes(1);
  });

  it("does nothing and leaves the URL untouched when no params are present", async () => {
    const apply = vi.fn();
    const onTimed = vi.fn();
    renderDeepLink("/flashcard/", {
      tryHandlers: [tryHandler(isFruit, apply)],
      onTimed,
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

  it("applies once and does not re-fire on a later param-bearing navigation (appliedRef latch)", async () => {
    const apply = vi.fn();
    renderDeepLink(
      "/flashcard/?try=apple",
      { tryHandlers: [tryHandler(isFruit, apply)] },
      "/flashcard/?try=banana"
    );

    // First mount: applies "apple" and strips the param.
    await waitFor(() => expect(currentLocation()).toBe("/flashcard/"));
    expect(apply).toHaveBeenCalledTimes(1);

    // Navigate again to a param-bearing URL on the SAME mount. The effect
    // re-runs, but appliedRef has latched, so it early-returns before applying
    // or stripping: "banana" is neither applied nor stripped. Without the
    // guard, "apple" + "banana" would both apply and the URL would re-strip.
    await userEvent.click(screen.getByRole("button", { name: "go" }));
    await waitFor(() =>
      expect(currentLocation()).toBe("/flashcard/?try=banana")
    );
    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply).not.toHaveBeenCalledWith("banana");
  });
});
