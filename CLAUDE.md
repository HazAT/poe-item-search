# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chrome extension for Path of Exile 2 that allows players to paste in-game item text into the trade website search to automatically search for similar items. Works on both `pathofexile.com/trade` and `pathofexile.com/trade2`.

Features a React-based overlay panel (inspired by better-trading) with:
- Search history tracking
- Bookmarks with folder organization
- Pinned items
- Paste input for item text

## Tech Stack

- **React 18** with TypeScript
- **Vite** for bundling (IIFE output for Chrome extension)
- **Tailwind CSS** with PoE theme colors
- **Zustand** for state management
- **Storybook** for component development
- **Shadow DOM** for style isolation from host page

## Commands

```bash
bun run dev          # Build watch + Storybook together (auto-reload enabled)
bun run dev:build    # Build watch only (auto-reload enabled)
bun run build        # Production build (outputs to dist/)
bun test             # Run tests with Bun's test runner
bun run storybook    # Start Storybook dev server on port 6006
bun run package      # Build and create extension.zip (prompts for version)
bun run update-stats # Fetch latest stats.json from live PoE trade APIs
```

## Project Structure

```
src/
├── components/
│   ├── ui/           # Button, Input, Tabs, Modal, Icons
│   ├── panel/        # OverlayPanel, PanelHeader, TabMenu
│   ├── history/      # HistoryTab, HistoryEntry
│   ├── bookmarks/    # BookmarksTab, BookmarkFolder, BookmarkTrade
│   └── pinned/       # PinnedItemsTab, PinnedItem
├── stores/           # Zustand stores (panelStore, historyStore, etc.)
├── services/         # storage.ts, tradeLocation.ts
├── utils/            # uniqueId, copyToClipboard, extensionApi
├── types/            # TypeScript interfaces
├── content.tsx       # Entry point (React app injection)
└── index.css         # Tailwind imports + Google Fonts
stories/              # Storybook component stories
.storybook/           # Storybook configuration
```

## Architecture

### Entry Point & Flow
- `src/content.tsx` - Content script injected into PoE trade pages
  - Renders React app with Shadow DOM for style isolation
  - Uses `ExtensionRoot` component containing `CollapsedToggle` and `OverlayPanel`

### Overlay Panel
- `src/components/panel/OverlayPanel.tsx` - Main panel component
  - Uses Shadow DOM to isolate styles from host page
  - Injects Tailwind CSS and Google Fonts into shadow root
  - **Important:** Uses `zoom: 1.4` to compensate for PoE's `html { font-size: 10px }` which breaks Tailwind's rem units
  - Panel dimensions are adjusted for zoom (400px / 1.4 = 286px)

- `CollapsedToggle` - Button shown when panel is collapsed
  - Uses inline styles (not Tailwind) because it renders outside Shadow DOM

### State Management
- `src/stores/panelStore.ts` - Panel collapse state, active tab
- `src/stores/historyStore.ts` - Search history entries
- `src/stores/bookmarksStore.ts` - Bookmark folders and trades
- `src/stores/pinnedStore.ts` - Pinned items

### Core Logic (Item Parsing)
- `src/item.js` - Item parsing and search query building
  - `getSearchQuery()` - Main function that builds the trade API query
  - Converts resistance stats to pseudo stats (e.g., `pseudo.pseudo_total_fire_resistance`)
  - Groups attribute stats (str/dex/int) into weighted filters

- `src/stat.js` - Stat regex generation
  - Converts PoE stat templates (with `#` placeholders and `[option|option]` syntax) into regex patterns

- `src/search.js` - Agent capability module
  - `buildSearchQuery(itemText)` - Main function for agents to convert item text to trade query
  - `buildTradeRequest(itemText)` - Returns complete trade API request body

### Test Structure
- Tests are in `src/*.test.js` (co-located with source)
- Test fixtures in `tests/fixtures/` - raw item text dumps and stats.json from PoE API
- Uses `Bun.file().text()` to load fixture text files

## Important Implementation Notes

### Shadow DOM & Styling
The overlay panel uses Shadow DOM for style isolation. Key considerations:
- Tailwind CSS is injected as inline styles into the shadow root
- Google Fonts link is injected directly into shadow root (CSS @import doesn't work when inlined)
- `rem` units are relative to document root, not shadow root - hence the zoom workaround

### PoE Trade Page Quirks
- PoE trade page sets `html { font-size: 10px }` instead of standard 16px
- This breaks all Tailwind rem-based sizing
- Solution: `zoom: 1.4` on shadow root container, with proportionally adjusted dimensions

### Storage
- Uses `localStorage` for persistence (simpler and more reliable than chrome.storage)
- See `src/utils/extensionApi.ts` for the abstraction

## Development Workflow

### Auto-Reload Development
- **Always run `bun run dev` first** - runs build watch + Storybook concurrently (color-coded output)
- **Don't run `bun run build` manually** - rely on the dev server for builds
- This ensures you have build output available and can see any compilation errors
- Run `bun run dev:build` for build watch only (if you don't need Storybook)
- Changes to source files trigger automatic rebuild (~1 second)
- Extension and all PoE trade tabs auto-reload when changes are detected
- Background service worker polls content.js hash every 1 second
- **First time setup:** After running dev, manually reload extension once in chrome://extensions to register the background script
- Dev mode adds `tabs` permission and background script (not included in production builds)

### Dev Mode Indicator
- In dev builds, a "DEV" indicator appears in the panel header (next to version number)
- Shows connection status to the background reload worker:
  - **Green dot**: Dev reload active - live reload is working
  - **Red dot**: Dev reload disconnected - need to reload extension or check background worker
  - **Yellow dot**: Checking connection status
- Uses heartbeat ping/pong between content script and background worker (every 3 seconds)
- Only appears in dev builds (`BUILD_MODE=dev`), tree-shaken from production

### Storybook First
- **Always update Storybook stories** when creating or modifying components
- **Test components in Storybook first** before testing in the extension
- Run `bun run storybook` to start the dev server on port 6006
- Storybook provides isolated component testing without needing to load the full extension
- **CRITICAL: Keep Storybook display components in sync with actual components** - When modifying any component styling or behavior, ALWAYS update the corresponding Storybook display component (e.g., `HistoryEntryDisplay`, `BookmarkFolderDisplay`, `BookmarkTradeDisplay`) to match. Out-of-sync stories are useless for testing.

### Validate with Playwriter
- **Always use Playwriter MCP** to validate UI changes in the browser
- Use Playwriter to interact with Storybook components and verify behavior
- Use Playwriter to test the extension on live PoE trade pages
- Playwriter can take accessibility snapshots, click elements, and verify state changes
- With `bun run dev` running, changes auto-reload - no manual refresh needed
- **If no pages are connected**, use `mcp__playwriter__reset` to reset the connection
- **When debugging and can't find the dedicated page**: Prompt the user to connect Playwriter MCP to both:
  1. A PoE trade page (pathofexile.com/trade or trade2) for testing the extension
  2. Storybook (localhost:6006) for isolated component testing
- To connect a page: User clicks the Playwriter extension icon on the tab they want to control

### Debug Logging
- **Don't be shy to add debug logs** to understand what's going on
- Use the built-in debug logging functionality in the extension
- Debug logs help trace item parsing, state changes, and API interactions
- Enable debug mode in the settings modal to see detailed logs in the console
- Don't remove debug logs you added at one point, they had a reason

## PoE Trade API Notes

The extension works with both trade API versions:
- `/api/trade/` - PoE 1 trade
- `/api/trade2/` - PoE 2 trade

Stats API provides stat definitions with `#` as value placeholder and `[A|B]` for option groups.
