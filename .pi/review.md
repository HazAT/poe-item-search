# Code Review

**Reviewed:** Reorder bookmarks — up/down arrows for folders and trades
**Verdict:** NEEDS CHANGES

## Summary
Clean, well-structured implementation that follows existing patterns. However, there's one critical bug (duplicate store methods) and one logic bug with archived folder reordering.

## Findings

### [P0] Duplicate `moveFolder` and `moveTrade` methods in store
**File:** `src/stores/bookmarksStore.ts:172` and `src/stores/bookmarksStore.ts:211` (moveFolder), `:185` and `:280` (moveTrade)
**Issue:** Both `moveFolder` and `moveTrade` are defined **twice** in the store object literal. The second definition silently overwrites the first. In strict mode or future tooling this could error. More importantly, having dead code is confusing and one pair uses single quotes while the other uses double quotes, suggesting a copy-paste accident.
**Impact:** The first definitions (lines 172 and 185) are dead code — they're overwritten. This works by accident but is a bug waiting to happen.
**Suggested Fix:** Remove the duplicate definitions at lines 172-200 (the first `moveFolder` and `moveTrade` blocks with single quotes).

### [P1] moveFolder swaps in full array but isFirst/isLast computed from filtered view
**File:** `src/stores/bookmarksStore.ts:211` and `src/components/bookmarks/BookmarksTab.tsx:215-218`
**Issue:** `isFirst`/`isLast` are computed from `visibleFolders` (which filters out archived folders when `showArchived` is false). But `moveFolder` swaps by index in the full `folders` array. If archived folders exist between visible ones, pressing "up" might swap with a hidden archived folder, causing no visible change or unexpected jumps.
**Impact:** Confusing UX when archived folders exist — user clicks "up" but nothing visibly changes.
**Suggested Fix:** `moveFolder` should find the adjacent *visible* folder to swap with (or the component should pass the actual folder ID to swap with rather than a direction). Simplest fix: in the store, swap with the next non-archived folder in the given direction. Or pass `showArchived` context.

### [P2] No Storybook story updates
**Issue:** Per CLAUDE.md: "Always update Storybook stories when creating or modifying components." `SearchEntry` got new props (`onMoveUp`/`onMoveDown`) but no stories were added showing the reorder buttons.
**Suggested Fix:** Add a story variant showing `SearchEntry` with move arrows visible.

### [P2] Plan called for `ui/index.ts` export but wasn't needed
**Issue:** Minor — plan listed `src/components/ui/index.ts` as needing changes, but `export *` from Icons already covers it. No issue, just noting plan vs. reality.

## What's Good
- Store methods have proper bounds checking (index -1, out of range)
- `e.stopPropagation()` on folder arrows prevents toggling expand/collapse
- Conditional rendering (`!isFirst`/`!isLast`) cleanly hides irrelevant arrows
- Follows existing patterns for Button variant/size and icon sizing
- `ChevronUpIcon` SVG matches the style of existing icon components

## Next Steps
- [ ] Remove duplicate `moveFolder` and `moveTrade` definitions from store
- [ ] Fix moveFolder to handle archived/hidden folders in the swap logic
- [ ] Add Storybook stories for SearchEntry with move arrows
