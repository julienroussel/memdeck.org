# Memdeck.org Development Guide

## Commands
- Development: `npm run dev` - Starts Vite development server
- Build: `npm run build` - Runs knip, eslint, typescript, vite build, and fta
- Lint: `npm run lint` - Runs ESLint
- Preview: `npm run preview` - Previews built site
- Type Check: `tsc -b` - Checks TypeScript types

## Code Style
- TypeScript with strict mode enabled
- ESLint with JS, TS, and import plugins
- React hooks linting rules enforced
- React-jsx transform mode
- Unused locals/parameters not allowed
- Switch fallthrough cases prohibited
- No unchecked side effect imports
- ES2020 target
- Module resolution: bundler
- Prettier for formatting (v3.5.3)
- Import organization enforced by eslint-plugin-import

## File Organization
- Components in src/components
- Pages in src/pages
- Types in src/types
- Utilities in src/utils
- Stack definitions in src/types/stacks