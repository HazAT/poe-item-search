# Tier Filtering Feature - Current Status

**Branch:** `feature/tier-filtering`
**Worktree:** `/Users/haza/Projects/poe-item-search/.worktrees/tier-filtering`
**Last Updated:** 2026-01-03

## Completed Tasks (12/12)

1. ✅ Generation script skeleton (`scripts/generate-tier-data.js`)
2. ✅ Package.json script (`bun run generate-tiers`)
3. ✅ Output directory (`src/data/`)
4. ✅ Mod-to-tier extraction functions
5. ✅ Tier data structure generation (`src/data/tiers.json` - 10 stats)
6. ✅ Tests for generated data (`scripts/generate-tier-data.test.js`)
7. ✅ DOM exploration with Playwriter (findings in `docs/plans/2026-01-03-dom-exploration.md`)
8. ✅ TierDropdown component (`src/components/tiers/TierDropdown.tsx`)
9. ✅ Storybook story (`stories/TierDropdown.stories.tsx`)
10. ✅ Tier data service (`src/services/tierData.ts`)
11. ✅ DOM injector skeleton (`src/services/tierInjector.ts`)
12. ✅ CLAUDE.md updated with data update instructions

## Key Files

```
scripts/generate-tier-data.js     # Generates tier data from mods.json
scripts/generate-tier-data.test.js # Tests for tier data
src/data/tiers.json               # Generated tier mappings (10 stats)
src/components/tiers/TierDropdown.tsx # React dropdown component
src/services/tierData.ts          # Query tier data by stat/class
src/services/tierInjector.ts      # DOM injection (skeleton - needs integration)
```

## Remaining Work

### Integration Tasks (not in original plan)

1. **Wire up injector** - Call `injectTierDropdowns()` when extension loads on trade page
   - Likely in `src/content.tsx` or create new entry point for trade page injection

2. **React rendering** - Replace placeholder buttons in tierInjector.ts with actual React TierDropdown
   - Use `createRoot()` to render React into injected container
   - Need to handle component unmounting on filter removal

3. **Event handling** - Connect tier selection to actually updating the min input value
   - Dispatch input events so Vue picks up the change

### Testing

- Run Storybook (`bun run storybook`) to test TierDropdown visually
- Test on live trade site after integration

## DOM Findings (from exploration)

- Stat filters: `.filter.full-span` in "Stat Filters" group
- Stat ID: `element.__vue__.$props.filter.id`
- Min input: `input.minmax[placeholder="min"]`
- Item class: `.multiselect__single` in Type Filters

## Commands

```bash
bun run generate-tiers  # Regenerate tier data
bun test                # Run tests (85 passing)
bun run storybook       # Visual testing
bun run dev             # Development mode
```
