# Reorder Bookmarks and Folders

**Date:** 2026-02-08
**Status:** Draft
**Directory:** /Users/haza/Projects/poe-item-search

## Overview

Add up/down arrow buttons to reorder folders and bookmark trades within folders. Arrows appear on hover alongside existing action buttons. First item hides up arrow, last item hides down arrow.

## Approach

### Key Decisions

- Reorder via array index swap (simple, no drag-and-drop)
- Add `ChevronUpIcon` to Icons.tsx (matching existing `ChevronDownIcon` style)
- Add `moveFolder(id, direction)` and `moveTrade(folderId, tradeId, direction)` to bookmarks store
- For trades: add `onMoveUp`/`onMoveDown` optional props to `SearchEntry` component
- For folders: add arrow buttons directly in `BookmarkFolder` hover group

### Files to Change

1. `src/components/ui/Icons.tsx` — Add `ChevronUpIcon`
2. `src/components/ui/index.ts` — Export `ChevronUpIcon`
3. `src/stores/bookmarksStore.ts` — Add `moveFolder` and `moveTrade` methods
4. `src/components/shared/SearchEntry.tsx` — Add optional `onMoveUp`/`onMoveDown` props and render arrows
5. `src/components/bookmarks/BookmarksTab.tsx` — Pass move handlers and index/count info, add arrows to folders
