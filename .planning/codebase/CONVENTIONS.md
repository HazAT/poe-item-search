# Coding Conventions

**Analysis Date:** 2026-01-13

## Naming Patterns

**Files:**
- `PascalCase.tsx` for React components.
- `camelCase.ts/js` for logic, services, utilities.
- `camelCase.test.js` for tests.
- `camelCase.stories.tsx` for stories.

**Functions:**
- `camelCase` for all functions.
- Hook names: `use[Feature]` (e.g., `usePanelStore`).
- Handlers: `handle[Event]` (standard React convention).

**Variables:**
- `camelCase` for variables.
- `UPPER_SNAKE_CASE` for constants (e.g., `PANEL_WIDTH`).

**Types:**
- PascalCase for Interfaces and Types.

## Code Style

**Formatting:**
- Prettier is likely used (inferred from consistent style).
- Indentation: 2 spaces.
- Semicolons: Required.
- Quotes: Double quotes `"` generally preferred in TSX/TS.

**Imports:**
- Path Alias: `@/` maps to `src/`.
- Relative imports used within modules.
- Explicit extensions (`.js`) used in some internal imports (e.g., `import ... from "./search.js"` in tests).

## Error Handling

**Patterns:**
- `try/catch` blocks in async functions.
- Sentry `captureException(error, context)` for reporting.
- `debug.error` and `debug.warn` for local logging.

## Logging

**Framework:**
- Custom `debug` utility (`src/utils/debug.ts`).
- Levels: `log`, `warn`, `error`.
- Production: Console logs likely stripped or reduced, Sentry used for errors.

## Comments

**JSDoc:**
- Used for core logic functions (e.g., `src/content.tsx` functions).
- `/** ... */` block comments above complex functions.

## Component Design

**Structure:**
- Functional Components with Hooks.
- Styles: Tailwind CSS classes.
- Shadow DOM: Components are rendered inside a Shadow Root, so global styles don't apply directly unless injected.

## Module Design

**Stores:**
- Zustand stores defined in `src/stores/`.
- Export hooks: `export const useStore = create(...)`.

**Services:**
- Singleton objects or collection of exported functions.

---

*Convention analysis: 2026-01-13*
*Update when patterns change*
