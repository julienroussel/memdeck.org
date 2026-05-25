---
paths:
  - "src/components/nav-links.tsx"
  - "src/components/header.tsx"
---

# Mantine Component Gotchas

Mantine ships subtle accessibility and behavior defaults that don't match what their prop names suggest. The patterns below recovered from real audits (2026-05-25 H5).

## `NavLink` `active=` does NOT emit `aria-current="page"`

Mantine `<NavLink active={...}>` only renders `data-active` for styling — it does NOT set `aria-current="page"`. Screen readers therefore have no programmatic way to know which route is current. Always pass both:

```tsx
<NavLink
  active={location.pathname === ROUTES.x}
  aria-current={location.pathname === ROUTES.x ? "page" : undefined}
  component={Link}
  to={ROUTES.x}
  ...
/>
```

Don't pass `aria-current="page"` to NavLinks that aren't route links (e.g., the parent `<NavLink component="button">` that toggles a submenu). Those need no `aria-current` at all.

Verified against `@mantine/core/esm/components/NavLink/NavLink.mjs` lines 70-95 on Mantine 9.x.

## When adding new Mantine wrappers, audit the rendered ARIA

When introducing a new use of a Mantine component (Tabs, Stepper, Accordion, NavLink), open the rendered DOM in devtools and confirm the expected ARIA states are present. Mantine's API is comprehensive but not exhaustive — props that look semantic (`active`, `selected`, `expanded`) sometimes only set data attributes for CSS styling. Don't assume; verify.
