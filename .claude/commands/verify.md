---
description: Run the Definition of Done for memdeck.org
---

Run the verification protocol from CLAUDE.md, in order, stopping at the first failure:

1. `pnpm run typecheck`
2. `pnpm run lint`
3. `pnpm run test`

Report pass/fail per step. On failure, show the relevant output (not the full log) and stop.

Do NOT run `pnpm run test:e2e` or `pnpm run build` unless the user explicitly asks — they are slow and only warranted when routing, build config, or `public/` assets changed.
