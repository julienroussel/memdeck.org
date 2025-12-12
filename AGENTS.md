# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MemDeck is a memorized deck training tool for magicians and memory enthusiasts. It helps users master famous memorized deck systems (Mnemonica, Aronson, Memorandum, Redford, Particle) through flashcard exercises and utilities.

The project is a React SPA using TypeScript, Mantine UI, and Vite. It runs entirely client-side with no backend, using localStorage for persistence.

## Development Commands

```bash
# Start development server
npm run dev

# Run linter
npm run lint

# Type checking
npm run typecheck

# Check for unused dependencies/exports
npm run knip

# Build for production (runs knip, eslint, typecheck, and vite build)
npm run build

# Preview production build
npm run preview

# Analyze bundle (after build)
npm run fta
```

## Code Architecture

### Type System for Playing Cards

The codebase uses a sophisticated type-safe approach to represent playing cards:

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

- **Routing**: Hash-based routing (`HashRouter`) via React Router in `src/Routes.tsx`
- **UI Framework**: Mantine with custom color scheme management stored in localStorage
- **Pages**: Self-contained in `src/pages/` - each training mode is its own page
- **Components**: Reusable UI in `src/components/` (e.g., `CardSpread`, `StackPicker`, `NumberCard`)
- **State**: Primarily local component state with localStorage persistence via `useLocalDb` hook

### Key Features

- **Flashcard Mode** (`src/pages/Flashcard/`): Main training feature with three modes:
  - Card-only: Shows card, user guesses position
  - Index-only: Shows position, user guesses card
  - Both modes: Randomly alternates between the two
- **ACAAN** (`src/pages/ACAAN.tsx`): Any Card At Any Number calculator
- **Shuffle** (`src/pages/Shuffle.tsx`): Shuffle simulation tool
- **Toolbox** (`src/pages/Toolbox.tsx`): Collection of memorized deck utilities

## Configuration Files

- **knip.json**: Dependency and export checker config. Note that `isbot` is an ignored transitive dependency from React Router
- **eslint.config.js**: Flat config format using TypeScript ESLint, import plugin, and React hooks
- **tsconfig.json**: Project references to `tsconfig.app.json` and `tsconfig.node.json`
- **vite.config.ts**: Minimal Vite config with React plugin

## Local Storage Keys

Defined in `src/constants.ts`:
- `SELECTED_STACK_LSK`: Currently selected memorized deck
- `FLASHCARD_OPTION_LSK`: Flashcard mode preference

## Adding a New Memorized Deck

1. Create `src/types/stacks/newdeck.ts` with the 52-card order
2. Import and add to the `stacks` object in `src/types/stacks.ts`
3. The deck will automatically appear in the StackPicker component
