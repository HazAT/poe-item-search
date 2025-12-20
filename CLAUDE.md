# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chrome extension for Path of Exile 2 that allows players to paste in-game item text into the trade website search to automatically search for similar items. Works on both `pathofexile.com/trade` and `pathofexile.com/trade2`.

## Commands

```bash
npm run build        # Build with Vite (outputs to dist/)
npm run watch        # Build with watch mode for development
npm test             # Run tests with Vitest
npm run package      # Build and create extension.zip (prompts for version)
npm run update-stats # Fetch latest stats.json from live PoE trade APIs
```

## Architecture

### Entry Point & Flow
- `src/content.js` - Content script injected into PoE trade pages
  - Injects a paste input field into the trade UI
  - On paste: fetches stats API → builds query → POSTs search → redirects to results

### Core Logic
- `src/item.js` - Item parsing and search query building
  - `getSearchQuery()` - Main function that builds the trade API query
  - Groups resistance stats (fire/cold/lightning/chaos) into weighted filters
  - Groups attribute stats (str/dex/int) into weighted filters
  - Other stats use "and" filters

- `src/stat.js` - Stat regex generation
  - Converts PoE stat templates (with `#` placeholders and `[option|option]` syntax) into regex patterns
  - Handles implicit vs explicit stat differentiation via `(implicit)` suffix matching

- `src/ui.js` - DOM manipulation for the paste input field

### Test Structure
- Tests are in `src/*.test.js` (co-located with source)
- Test fixtures in `tests/fixtures/` - raw item text dumps and stats.json from PoE API
- Uses Vite's `?raw` import for fixture text files

## PoE Trade API Notes

The extension works with both trade API versions:
- `/api/trade/` - PoE 1 trade
- `/api/trade2/` - PoE 2 trade

Stats API provides stat definitions with `#` as value placeholder and `[A|B]` for option groups.
