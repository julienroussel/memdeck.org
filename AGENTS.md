# AGENTS.md

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

# Build for production
pnpm run build

# Preview production build
pnpm run preview

# Check file complexity
pnpm run fta
```

Run `pnpm run fta` after making significant changes to verify file complexity stays within acceptable thresholds.

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

- **Routing**: Route definitions in `src/routes.tsx`, route paths centralized in `src/constants.ts` (`ROUTES` object), `BrowserRouter` in `src/provider.tsx`. GitHub Pages SPA support via `public/404.html` redirect. Pages are lazy-loaded with `lazyWithReload` (a custom wrapper around `React.lazy` with chunk-error retry) and `Suspense`
- **UI Framework**: Mantine with custom color scheme management stored in localStorage
- **Pages**: Self-contained in `src/pages/` — each training mode is its own page. Stack-dependent pages are wrapped in `RequireStack`
- **Components**: Reusable UI in `src/components/` (e.g., `CardSpread`, `StackPicker`, `NumberCard`, `ShareButton`, `ShareNudge`, `NavFooter`)
- **Hooks**: Custom hooks in `src/hooks/` (e.g., `useSelectedStack`, `usePwaInstall`, `useDocumentMeta`)
- **Utils**: Pure utility functions in `src/utils/` (e.g., `card-selection`, `card-formatting`, `localstorage`, `share`, `is-pwa`)
- **Services**: `src/services/analytics.ts` — Google Analytics 4 integration with event tracking (only active on `memdeck.org`). Tracks flashcard/spot-check/ACAAN answers, session completions, share actions, web vitals, and errors
- **i18n**: `src/i18n/` — 7 languages (en, fr, es, de, it, nl, pt) using `react-i18next`. Locale files are lazy-loaded as separate chunks. Type-safe keys derived from the English locale
- **State**: Primarily local component state with localStorage persistence

### Key Features

- **Flashcard Mode** (`src/pages/flashcard/`): Main training feature with three modes (card-only, index-only, both). Presents 5 choices with optional timer (5s–60s)
- **Spot Check** (`src/pages/spot-check/`): Visual deck inspection training with three variants — missing card, swapped cards, or moved card. Uses an interactive card spread
- **ACAAN** (`src/pages/acaan/`): Any Card At Any Number calculator with instant feedback
- **Toolbox** (`src/pages/toolbox/`): Collection of memorized deck utilities
- **Stats** (`src/pages/stats/`): Session history, accuracy statistics, and best streak tracking
- **Guide** (`src/pages/guide/`): Getting started and training instructions
- **Resources** (`src/pages/resources.tsx`): Curated reading list of memorized deck books and PDFs
- **About** (`src/pages/about.tsx`): Project info and links

### PWA & SEO

- **Progressive Web App**: Full offline support via service worker (Vite PWA plugin). Silent auto-updates with subtle toast notification. Mobile install prompt with iOS/Android-specific instructions
- **Pre-rendering**: Static HTML generated for all routes at build time for SEO
- **AI Discoverability**: `public/llms.txt` and `public/llms-full.txt` for LLM indexing
- **Share**: Native Web Share API on mobile, clipboard fallback on desktop. Share nudge appears after 5+ completed sessions

## TypeScript Standards

**Strict typing is mandatory.** This project enforces full TypeScript strictness — loose or weak typings are never acceptable. Every type must be precise, narrowed, and intentional. Code that compiles but uses escape hatches (`any`, unnecessary `as` casts, `@ts-ignore`, `@ts-expect-error`) to sidestep the type system will be rejected. When in doubt, write the stricter type. Run `pnpm run typecheck` and fix all errors before considering any change complete.

- **No `any`.** Use `unknown` at system boundaries, proper types everywhere else. Do not use `any` as a shortcut to silence type errors — find and fix the root cause instead.
- **`as` casts are prohibited.** Do not use `as` to coerce types. Instead, use type guards, discriminated unions, `satisfies`, or restructure the code so the compiler can infer the correct type. If — and only if — no other solution exists (e.g., parsing untyped JSON from localStorage or an external API), an `as` cast may be used as a last resort. Every `as` must include a comment justifying why it is necessary and must be validated during code review before it is accepted.
- **No `@ts-ignore` or `@ts-expect-error`.** Fix the type error properly rather than suppressing it.
- **No implicit `any`.** All function parameters, return types for exported functions, and callback arguments must be explicitly typed. Rely on inference only where the compiler can fully resolve the type.
- **Prefer discriminated unions over optional fields with boolean flags.** Use `{ status: 'loading' } | { status: 'success'; data: T } | { status: 'error'; error: Error }` instead of `{ isLoading: boolean; data?: T; error?: Error }`. This makes impossible states unrepresentable.
- **Derive types from runtime data.** Use `typeof`, `keyof`, `ReturnType`, and mapped types to keep types in sync with values. Don't duplicate type definitions that can be inferred.
- **Use `as const` for literal types and immutable data** (already used extensively for card/stack definitions).
- **Use type narrowing over assertions.** Prefer type guards and control flow narrowing to validate types at runtime.
- **Generic constraints must be tight.** Use `<T extends SpecificType>` rather than unconstrained `<T>` when the generic is expected to satisfy a shape.

## React Standards

- **Components under ~150 lines.** Extract custom hooks for logic and sub-components for rendering when they grow.
- **Named handler functions over inline lambdas in JSX.** `const handleClick = () => { ... }` is easier to debug than anonymous arrows.
- **No component definitions inside other components.** Extract to the same file or a separate file.
- **Extract complex JSX conditions into variables or early returns.** Avoid ternaries longer than one line in JSX.
- **Hooks at the top level only**, never conditionally.
- **Correct dependency arrays** in `useEffect`, `useMemo`, `useCallback`.
- **Use semantic HTML and ARIA attributes** for accessibility. Prefer `<button>`, `<nav>`, etc. over divs with roles.
- **Use position-based keys in `CardSpread`** (`spread_${index}`). Data-based keys (e.g., `card_${suit}_${rank}`) cause all DOM nodes to be destroyed and recreated when switching between card and number items, producing visible flicker.

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
- **Linter auto-removes unused imports.** The linter runs automatically on file save and strips any import that is not yet referenced in the file. When adding a new import that is used in code you're about to write, **always use the `Write` tool to write the full file** (or at minimum an `Edit` that includes both the import and its usage in a single operation). Never add an import line by itself via `Edit` — the linter will remove it before you can add the code that uses it.

## Configuration Files

- **knip.json**: Dependency and export checker config. Ignores `@biomejs/biome`, `globals`, and `lefthook`
- **tsconfig.json**: Project references to `tsconfig.app.json` and `tsconfig.node.json`
- **vite.config.ts**: Minimal Vite config with React plugin
- **vitest.config.ts**: Test runner configuration
- **playwright.config.ts**: E2E test configuration

## Constants

Application constants are defined in `src/constants.ts`, including localStorage keys (suffixed `_LSK`), card dimensions, and site metadata.

## Copy & Tone Guidelines

All user-facing English text must follow these principles:

- **Audience**: Card magicians and memory enthusiasts — people who know what a memorized deck is or are actively learning one. Write for practitioners, not tourists.
- **Tone**: Casual, direct, and encouraging — like a fellow magician sharing a useful tool. Avoid corporate speak, marketing fluff, and overly formal language.
- **Voice**: Second person ("you", "your"). First person ("I", "me") only when Julien is speaking directly (e.g., about page, intro message).
- **Terminology**: Use "memorized deck" or "stack" — never both together ("memorized deck stack" is redundant). Use "stack" when context is already clear (e.g., inside the app after a stack is selected). Use "memorized deck" for first mentions or when speaking to newcomers.
- **Action words**: Prefer "recall" over "guess" in training contexts — users are building recall, not guessing. Use "pick" or "tap" for UI instructions.
- **Capitalization**: "GitHub" (not "Github"). Product names and proper nouns use their official casing.
- **Punctuation**: End all descriptions and sentences with periods. Use em dashes (—) for asides, not hyphens. Use the Oxford comma.
- **Compound adjectives**: Hyphenate before nouns ("52-card preset", "tap-based UI").
- **Keep it tight**: Prefer short, punchy sentences. Cut filler words. If a description can be one sentence, don't make it two.
- **Consistency**: When multiple items share a parallel structure (e.g., mode descriptions), keep the sentence pattern and verb tense consistent across all of them.

## Adding a New Memorized Deck

1. Create `src/types/stacks/newdeck.ts` with the 52-card order
2. Import and add to the `stacks` object in `src/types/stacks.ts`
3. The deck will automatically appear in the StackPicker component
