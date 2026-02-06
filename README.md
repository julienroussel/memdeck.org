# MemDeck

**MemDeck** is a simple yet effective tool designed to help anyone master a memorized deck of cards. Whether you're a magician, a memory enthusiast, or just curious about the art of memorization, MemDeck provides straightforward exercises to train and test your knowledge.

## About the Project

This is a side project, built with one goal in mind: **keeping things simple**. No distractions, no unnecessary features — just a clean and efficient tool to help you learn and retain a memorized deck.

## Supported Stacks

MemDeck supports five famous memorized deck systems:

- **Mnemonica** — Juan Tamariz
- **Aronson** — Simon Aronson
- **Memorandum** — Woody Aragon
- **Redford** — Patrick Redford
- **Particle** — Joshua Jay

## Features

### Flashcard Trainer

Test your recall with three training modes:

- **Card Only** — See a card, guess its position in the stack
- **Number Only** — See a position, pick the correct card
- **Both Modes** — Randomly alternates between the two

Each mode presents five choices and tracks your score in real time. An optional **timer mode** adds time pressure with configurable durations (5s, 10s, 15s, 30s, 60s).

### ACAAN Calculator

Train your Any Card At Any Number calculations:

- A target card and position are shown
- Calculate and input the required cut depth
- Instant feedback with the correct answer
- Optional timer mode with the same duration options

### Interactive Card Spread

Browse any selected stack with an interactive spread that supports mouse drag, touch gestures, and keyboard navigation (arrow keys).

### Resources

A curated collection of books and materials for learning memorized deck systems, including works by Tamariz, Aronson, Hartling, Aragon, Redford, and Jay.

### Dark / Light Mode

Toggle between dark and light themes. Your preference is persisted across sessions.

## Tech Stack

- **React** 19 with **TypeScript**
- **Mantine** UI framework
- **Vite** for builds and development
- **Vitest** + **Playwright** for unit and E2E testing
- **Biome** (via Ultracite) for formatting and linting

Runs entirely client-side with no backend. State is persisted in localStorage.

## Installation

To run MemDeck locally:

1. Clone the repository:

   ```sh
   git clone https://github.com/julienroussel/memdeck.org
   cd memdeck.org
   ```

2. Install dependencies:

   ```sh
   pnpm install
   ```

3. Start the development server:

   ```sh
   pnpm run dev
   ```

## Development

```bash
pnpm run lint          # Check formatting and lint rules
pnpm run typecheck     # Type checking
pnpm run test          # Unit tests
pnpm run test:e2e      # E2E tests (Playwright)
pnpm run validate      # Full validation (knip + lint + typecheck + fta)
pnpm run build         # Production build
```

## Contributions

Want to improve MemDeck? Feel free to fork the project, open an issue, or submit a pull request. Keep it simple, keep it useful.

## License

This project is open-source and available under the [GPL-3.0 License](LICENSE).

## Acknowledgements

A huge shout-out to all memory enthusiasts and magicians who inspired this project!

Card SVG images are from <https://tekeye.uk/playing_cards/svg-playing-cards>
