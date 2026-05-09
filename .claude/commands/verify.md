---
description: Run the Definition of Done for memdeck.org
---

Run the verification protocol from CLAUDE.md, in order, stopping at the first failure:

1. `pnpm run typecheck`
2. `rtk proxy pnpm run lint` (NOT `pnpm run lint` — the plain form OOMs in Claude sessions due to RTK output buffering; see CLAUDE.md "Lint invocation")
3. `pnpm run knip`
4. `pnpm run fta`
5. `pnpm run test:coverage`

Report pass/fail per step. On failure, show the relevant output (not the full log) and stop.

Do NOT run `pnpm run test:e2e` or `pnpm run build` unless the user explicitly asks — they are slow and only warranted when routing, build config, or `public/` assets changed.
