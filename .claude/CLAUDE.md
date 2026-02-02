# Code Quality

## Priorities

**Correctness > Readability > Testability > Simplicity > Performance.**

Do not sacrifice readability for micro-optimizations. Write obvious, clear code.

## Formatting

This project uses **Ultracite** (a Biome preset) for automated formatting and linting.

- **Check for issues**: `pnpm run lint`
- **Auto-fix**: `npx ultracite fix`

Run lint before committing. Most issues are auto-fixable.

## Key Rules

- No `any` — use `unknown` at boundaries, proper types elsewhere
- No `as` casts except at system boundaries — use `satisfies` for validation
- No `var` — use `const` by default, `let` only when reassignment is needed
- No component definitions inside other components
- No `.only` or `.skip` in committed test code
- No `console.log`, `debugger`, or `alert` in production code
- Throw `Error` objects, not strings
- Use early returns over nested conditionals
- Use semantic HTML and ARIA attributes for accessibility
- Add `rel="noopener"` when using `target="_blank"`
