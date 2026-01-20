# Codebase Structure

**Analysis Date:** 2026-01-13

## Directory Layout

```
poe-item-search/
├── .storybook/         # Storybook configuration
├── assets/             # Static assets (images, icons)
├── dist/               # Build output
├── docs/               # Documentation
├── scripts/            # Build and maintenance scripts
├── src/                # Source code
│   ├── background/     # Background service worker
│   ├── components/     # React components
│   ├── data/           # Static data (stats, tiers)
│   ├── injected/       # Scripts injected into host page
│   ├── services/       # Business logic services
│   ├── stores/         # Zustand state stores
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Utility functions
│   ├── App.tsx         # Main React component
│   ├── content.tsx     # Content script entry point
│   ├── index.css       # Global styles (Tailwind)
│   ├── item.js         # Item parsing logic
│   └── search.js       # Search query logic
├── stories/            # Storybook stories
├── tests/              # Test files and fixtures
├── package.json        # Project manifest
└── vite.config.ts      # Vite configuration
```

## Directory Purposes

**src/components/:**
- Purpose: UI components organized by feature.
- Subdirectories: `ui/` (base), `panel/` (layout), `history/`, `bookmarks/`, `settings/`.

**src/services/:**
- Purpose: Core business logic and external integrations.
- Key files: `searchInterceptor.ts`, `syncService.ts`, `storage.ts`.

**src/stores/:**
- Purpose: Global state management.
- Key files: `historyStore.ts`, `bookmarksStore.ts`, `panelStore.ts`.

**src/injected/:**
- Purpose: Scripts that run in the "Main" world of the browser (access to window objects).
- Key files: `interceptor.ts` (Network interception).

**scripts/:**
- Purpose: Node.js/Bun scripts for build and data maintenance.
- Key files: `fetch-stats.js` (Update PoE stats), `package.js` (Zip extension).

## Key File Locations

**Entry Points:**
- `src/content.tsx`: Main content script entry.
- `src/background/reload.ts`: Dev mode background script.

**Configuration:**
- `vite.config.ts`: Build and plugin config.
- `tailwind.config.ts`: Styling config.

**Core Logic:**
- `src/item.js`: Item text parsing regexes and logic.
- `src/search.js`: Trade API query construction.

**Testing:**
- `src/*.test.js`: Unit tests (co-located or root of src).
- `tests/fixtures/`: Test data files (item texts).

## Naming Conventions

**Files:**
- React Components: `PascalCase.tsx` (e.g., `OverlayPanel.tsx`).
- Logic/Utilities: `camelCase.ts` or `camelCase.js` (e.g., `searchInterceptor.ts`, `item.js`).
- Stores: `camelCase` + `Store.ts` (e.g., `historyStore.ts`).

**Directories:**
- Feature directories: `camelCase` (e.g., `bookmarks`, `history`).

## Where to Add New Code

**New UI Feature:**
- Component: `src/components/<feature>/`.
- State: `src/stores/<feature>Store.ts`.
- Story: `stories/<Feature>.stories.tsx`.

**New Logic:**
- Service: `src/services/<serviceName>.ts`.
- Utils: `src/utils/` if generic.

**New Parser Capability:**
- Item Logic: `src/item.js`.
- Search Logic: `src/search.js`.

## Special Directories

**src/injected/**:
- Purpose: These scripts are bundled separately or injected as raw strings/files into the page.
- Context: Runs in the page's JS context, not the extension content script context.

---

*Structure analysis: 2026-01-13*
*Update when directory structure changes*
