# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MemDeck is a memorized deck training tool for magicians and memory enthusiasts. It helps users master famous memorized deck systems (Mnemonica, Aronson, Memorandum, Redford, Particle, Elephant) through flashcard exercises and utilities.

The project is a React SPA using TypeScript, Mantine UI, and Vite. It runs entirely client-side with no backend, using localStorage for persistence.

## Code Priorities

**Correctness > Readability > Testability > Simplicity > Performance.**

Never sacrifice readability or testability for performance unless profiling proves it necessary. Prefer clear, obvious code over clever code. Explicit duplication is better than the wrong abstraction — but refactor once a pattern appears 3+ times.

## Development Commands

```bash
# Start development server
pnpm run dev

# Run linter (uses Ultracite/Biome)
pnpm run lint

# Type checking
pnpm run typecheck

# Run unit tests
pnpm run test

# Run unit tests with coverage
pnpm run test:coverage

# Run e2e tests (Playwright)
pnpm run test:e2e

# Check for unused dependencies/exports
pnpm run knip

# Full validation (knip + lint + typecheck + fta)
pnpm run validate

# Build for production
pnpm run build

# Preview production build
pnpm run preview

# Analyze bundle (after build)
pnpm run fta
```

## Code Architecture

### Type System for Playing Cards

The codebase uses a type-safe approach to represent playing cards:

- **Card Objects**: Each card is defined as a const object in `src/types/suits/*.ts` (e.g., `AceOfHearts`, `TwoOfClubs`)
- **PlayingCard Type**: Union type of all 52 card objects in `src/types/playingcard.ts`
- **Stack Type**: Type-safe array of exactly 52 cards (`FixedSizeArray<52, PlayingCard>`) defined in `src/types/stacks.ts`
- **Stack Definitions**: Each memorized deck (Mnemonica, Aronson, etc.) is defined in `src/types/stacks/*.ts` with a `name` and `order` array

This approach ensures compile-time safety for card operations and prevents invalid deck configurations.

### Stack System

All memorized decks are centralized in `src/types/stacks.ts`:

- Imported and exported via the `stacks` object
- Each stack has a display name and ordered array of 52 cards
- Helper functions like `getRandomPlayingCard()` and `getUniqueRandomCard()` operate on stacks

### Application Structure

- **Routing**: `BrowserRouter` via React Router in `src/Routes.tsx`. GitHub Pages SPA support via `public/404.html` redirect
- **UI Framework**: Mantine with custom color scheme management stored in localStorage
- **Pages**: Self-contained in `src/pages/` — each training mode is its own page
- **Components**: Reusable UI in `src/components/` (e.g., `CardSpread`, `StackPicker`, `NumberCard`)
- **Hooks**: Custom hooks in `src/hooks/` (e.g., `useSelectedStack`)
- **Utils**: Pure utility functions in `src/utils/` (e.g., `card-selection`, `card-formatting`, `localstorage`)
- **State**: Primarily local component state with localStorage persistence

### Key Features

- **Flashcard Mode** (`src/pages/flashcard/`): Main training feature with three modes (card-only, index-only, both)
- **ACAAN** (`src/pages/acaan.tsx`): Any Card At Any Number calculator
- **Toolbox** (`src/pages/toolbox.tsx`): Collection of memorized deck utilities

## TypeScript Standards

- **No `any`.** Use `unknown` at system boundaries, proper types everywhere else.
- **No `as` casts except at system boundaries** (e.g., parsing localStorage JSON). Every `as` is a code smell that needs justification. Use `satisfies` for type validation without widening.
- **Prefer discriminated unions over optional fields with boolean flags.** Use `{ status: 'loading' } | { status: 'success'; data: T } | { status: 'error'; error: Error }` instead of `{ isLoading: boolean; data?: T; error?: Error }`. This makes impossible states unrepresentable.
- **Derive types from runtime data.** Use `typeof`, `keyof`, `ReturnType`, and mapped types to keep types in sync with values. Don't duplicate type definitions that can be inferred.
- **Use `as const` for literal types and immutable data** (already used extensively for card/stack definitions).
- **Use type narrowing over assertions.** Prefer type guards and control flow narrowing to validate types at runtime.

## React Standards

- **Components under ~150 lines.** Extract custom hooks for logic and sub-components for rendering when they grow.
- **Named handler functions over inline lambdas in JSX.** `const handleClick = () => { ... }` is easier to debug than anonymous arrows.
- **No component definitions inside other components.** Extract to the same file or a separate file.
- **Extract complex JSX conditions into variables or early returns.** Avoid ternaries longer than one line in JSX.
- **Hooks at the top level only**, never conditionally.
- **Correct dependency arrays** in `useEffect`, `useMemo`, `useCallback`.
- **Use semantic HTML and ARIA attributes** for accessibility. Prefer `<button>`, `<nav>`, etc. over divs with roles.

## Testing Standards

- **Every new utility function and custom hook must have a colocated `.test.ts` file.**
- **Test behavior and edge cases, not implementation details.** Tests should describe what the function does, not how.
- **Use descriptive test names that read as specifications:** `it("returns the card at position N in the selected stack")` not `it("works correctly")`.
- **Run `pnpm run test` before committing.**
- **E2E tests** live in `e2e/` and use Playwright. Use them for user journey validation.
- Don't use `.only` or `.skip` in committed code.

## Code Organization

- **One concept per file.** If a file has multiple unrelated exports, split it.
- **Colocate tests with source files** (e.g., `card-selection.ts` and `card-selection.test.ts` in the same directory).
- **Extract shared logic into pure utility functions** (trivially testable) **or custom hooks** (for stateful logic).
- **Keep functions focused.** Use early returns to reduce nesting. Extract complex conditions into well-named boolean variables.
- **Use `const` by default**, `let` only when reassignment is needed, never `var`.
- **Use `for...of`** over `.forEach()` and indexed `for` loops.
- **Use optional chaining (`?.`) and nullish coalescing (`??`)** for safer property access.

## Formatting & Linting

This project uses **Ultracite** (a Biome preset) for formatting and linting.

- **Fix issues**: `pnpm run lint` to check, `npx ultracite fix` to auto-fix
- Most formatting and common issues are automatically fixable by Biome
- Run lint before committing to ensure compliance

## Configuration Files

- **knip.json**: Dependency and export checker config. `isbot` is an ignored transitive dependency from React Router
- **eslint.config.js**: Flat config format using TypeScript ESLint, import plugin, and React hooks
- **tsconfig.json**: Project references to `tsconfig.app.json` and `tsconfig.node.json`
- **vite.config.ts**: Minimal Vite config with React plugin
- **vitest.config.ts**: Test runner configuration
- **playwright.config.ts**: E2E test configuration

## Local Storage Keys

Defined in `src/constants.ts`:

- `SELECTED_STACK_LSK`: Currently selected memorized deck
- `FLASHCARD_OPTION_LSK`: Flashcard mode preference

## Adding a New Memorized Deck

1. Create `src/types/stacks/newdeck.ts` with the 52-card order
2. Import and add to the `stacks` object in `src/types/stacks.ts`
3. The deck will automatically appear in the StackPicker component
