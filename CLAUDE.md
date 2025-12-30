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
bun run build        # Build with Vite (outputs to dist/)
bun run dev          # Build with watch mode for development
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

### Chrome Extension Storage
- Uses `chrome.storage.local` for persistence
- Falls back to localStorage when not in extension context (for Storybook)
- See `src/utils/extensionApi.ts` for the abstraction

## Development Workflow

### Storybook First
- **Always update Storybook stories** when creating or modifying components
- **Test components in Storybook first** before testing in the extension
- Run `bun run storybook` to start the dev server on port 6006
- Storybook provides isolated component testing without needing to load the full extension

### Validate with Playwriter
- **Always use Playwriter MCP** to validate UI changes in the browser
- Use Playwriter to interact with Storybook components and verify behavior
- Use Playwriter to test the extension on live PoE trade pages
- Playwriter can take accessibility snapshots, click elements, and verify state changes
- **IMPORTANT:** After running `bun run build`, always prompt the user to refresh the extension in Chrome (chrome://extensions → click refresh icon) before testing with Playwriter MCP

### Debug Logging
- **Don't be shy to add debug logs** to understand what's going on
- Use the built-in debug logging functionality in the extension
- Debug logs help trace item parsing, state changes, and API interactions
- Enable debug mode in the settings modal to see detailed logs in the console

## PoE Trade API Notes

The extension works with both trade API versions:
- `/api/trade/` - PoE 1 trade
- `/api/trade2/` - PoE 2 trade

Stats API provides stat definitions with `#` as value placeholder and `[A|B]` for option groups.
