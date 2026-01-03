# Tier-Based Modifier Filtering Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add tier selection dropdowns to PoE trade site filters, allowing users to select T1, T2, etc. instead of manually entering min/max values.

**Architecture:** Generation script processes mods.json to create tier mappings keyed by trade API stat IDs. Extension injects tier dropdowns next to min fields for supported stats. Selecting a tier auto-fills the min value.

**Tech Stack:** Bun for generation script, React for UI components, Tailwind for styling.

---

## Prerequisites

Before starting, ensure mods data files exist:

```bash
# These files should exist in tests/fixtures/ (untracked, ~14MB total)
ls tests/fixtures/mods.json tests/fixtures/mods_by_base.json
```

If missing, download from poe-mods repo or PoE data sources.

---

## Task 1: Create Generation Script Skeleton

**Files:**
- Create: `scripts/generate-tier-data.js`

**Step 1: Create the script with basic structure**

```javascript
// scripts/generate-tier-data.js
import fs from 'fs';
import path from 'path';

const MODS_PATH = 'tests/fixtures/mods.json';
const MODS_BY_BASE_PATH = 'tests/fixtures/mods_by_base.json';
const OUTPUT_PATH = 'src/data/tiers.json';

// Stat IDs we care about (trade API ID -> game data stat pattern)
const STAT_WHITELIST = {
  // Damage to Attacks
  'explicit.stat_3032590688': { pattern: 'attack_minimum_added_physical_damage', name: 'Physical Damage to Attacks' },
  'explicit.stat_1573130764': { pattern: 'attack_minimum_added_fire_damage', name: 'Fire Damage to Attacks' },
  'explicit.stat_4067062424': { pattern: 'attack_minimum_added_cold_damage', name: 'Cold Damage to Attacks' },

  // Resistances
  'explicit.stat_3372524247': { pattern: 'fire_resistance_%', name: 'Fire Resistance' },
  'explicit.stat_4220027924': { pattern: 'cold_resistance_%', name: 'Cold Resistance' },
  'explicit.stat_1671376347': { pattern: 'lightning_resistance_%', name: 'Lightning Resistance' },
  'explicit.stat_2923486259': { pattern: 'chaos_resistance_%', name: 'Chaos Resistance' },

  // Attributes
  'explicit.stat_4080418644': { pattern: 'strength', name: 'Strength' },
  'explicit.stat_3261801346': { pattern: 'dexterity', name: 'Dexterity' },
  'explicit.stat_328541901': { pattern: 'intelligence', name: 'Intelligence' },
};

async function main() {
  console.log('Generating tier data...\n');

  // Check if source files exist
  if (!fs.existsSync(MODS_PATH)) {
    console.error(`Error: ${MODS_PATH} not found`);
    console.error('Download mods.json from poe-mods data source');
    process.exit(1);
  }

  console.log('Loading mods data...');
  const mods = JSON.parse(fs.readFileSync(MODS_PATH, 'utf-8'));

  console.log(`Loaded ${Object.keys(mods).length} mods`);
  console.log('TODO: Implement tier extraction');
}

main();
```

**Step 2: Run to verify it loads the data**

```bash
bun scripts/generate-tier-data.js
```

Expected output:
```
Generating tier data...

Loading mods data...
Loaded XXXXX mods
TODO: Implement tier extraction
```

**Step 3: Commit**

```bash
git add scripts/generate-tier-data.js
git commit -m "feat: add tier data generation script skeleton"
```

---

## Task 2: Add Package.json Script

**Files:**
- Modify: `package.json`

**Step 1: Add the generate-tiers script**

Add to the "scripts" section in package.json:

```json
"generate-tiers": "bun scripts/generate-tier-data.js"
```

**Step 2: Verify the script runs**

```bash
bun run generate-tiers
```

Expected: Same output as before.

**Step 3: Commit**

```bash
git add package.json
git commit -m "chore: add generate-tiers npm script"
```

---

## Task 3: Create Output Directory

**Files:**
- Create: `src/data/.gitkeep`

**Step 1: Create the data directory**

```bash
mkdir -p src/data
touch src/data/.gitkeep
```

**Step 2: Commit**

```bash
git add src/data/.gitkeep
git commit -m "chore: add src/data directory for tier data"
```

---

## Task 4: Implement Mod-to-Tier Extraction

**Files:**
- Modify: `scripts/generate-tier-data.js`

**Step 1: Add function to find mods by stat pattern**

Add after the STAT_WHITELIST:

```javascript
// Item classes we care about (trade API names)
const ITEM_CLASSES = ['Gloves', 'Boots', 'Body Armours', 'Helmets', 'Rings', 'Amulets', 'Belts', 'Quivers'];

// Map item class to spawn_weight tags
const CLASS_TO_TAGS = {
  'Gloves': ['gloves'],
  'Boots': ['boots'],
  'Body Armours': ['body_armour'],
  'Helmets': ['helmet'],
  'Rings': ['ring'],
  'Amulets': ['amulet'],
  'Belts': ['belt'],
  'Quivers': ['quiver'],
};

function findModsByStatPattern(mods, pattern) {
  const matches = [];

  for (const [modId, mod] of Object.entries(mods)) {
    if (!mod.stats) continue;

    const hasMatchingStat = mod.stats.some(stat =>
      stat.id && stat.id.includes(pattern)
    );

    if (hasMatchingStat) {
      matches.push({ modId, ...mod });
    }
  }

  return matches;
}

function canSpawnOnClass(mod, itemClass) {
  const tags = CLASS_TO_TAGS[itemClass];
  if (!tags || !mod.spawn_weights) return false;

  for (const sw of mod.spawn_weights) {
    if (tags.includes(sw.tag) && sw.weight > 0) {
      return true;
    }
  }
  return false;
}
```

**Step 2: Update main function to find and log matches**

Replace the TODO line with:

```javascript
  // Process each whitelisted stat
  for (const [statId, config] of Object.entries(STAT_WHITELIST)) {
    const matches = findModsByStatPattern(mods, config.pattern);
    console.log(`\n${config.name} (${statId}):`);
    console.log(`  Found ${matches.length} matching mods`);

    if (matches.length > 0) {
      // Log first match for debugging
      const first = matches[0];
      console.log(`  Example: ${first.name} (lvl ${first.required_level})`);
      console.log(`  Stats: ${JSON.stringify(first.stats)}`);
    }
  }
```

**Step 3: Run and verify output**

```bash
bun run generate-tiers
```

Expected: Should show matches for each stat type with example mod data.

**Step 4: Commit**

```bash
git add scripts/generate-tier-data.js
git commit -m "feat: add mod-to-stat pattern matching"
```

---

## Task 5: Build Tier Data Structure

**Files:**
- Modify: `scripts/generate-tier-data.js`

**Step 1: Add tier building function**

Add after the canSpawnOnClass function:

```javascript
function calculateAvgMin(stats) {
  // For damage stats with min/max (2 stats), average the minimums
  if (stats.length === 2) {
    const minStat = stats.find(s => s.id.includes('minimum'));
    const maxStat = stats.find(s => s.id.includes('maximum'));
    if (minStat && maxStat) {
      return (minStat.min + maxStat.min) / 2;
    }
  }
  // For single-value stats, use the minimum
  if (stats.length === 1) {
    return stats[0].min;
  }
  return stats[0].min;
}

function buildTiersForStat(mods, statConfig, itemClasses) {
  const matches = findModsByStatPattern(mods, statConfig.pattern);

  // Filter to prefix/suffix only (exclude corrupted, essence, etc.)
  const craftable = matches.filter(m =>
    m.generation_type === 'prefix' || m.generation_type === 'suffix'
  );

  // Sort by required_level descending (highest = T1)
  craftable.sort((a, b) => b.required_level - a.required_level);

  const tiersByClass = {};

  for (const itemClass of itemClasses) {
    const applicableMods = craftable.filter(m => canSpawnOnClass(m, itemClass));

    if (applicableMods.length === 0) continue;

    tiersByClass[itemClass] = applicableMods.map((mod, index) => ({
      tier: index + 1,
      name: mod.name,
      min: mod.stats.length === 2
        ? [mod.stats[0].min, mod.stats[1].min]
        : mod.stats[0].min,
      max: mod.stats.length === 2
        ? [mod.stats[0].max, mod.stats[1].max]
        : mod.stats[0].max,
      avgMin: calculateAvgMin(mod.stats),
      ilvl: mod.required_level,
    }));
  }

  return tiersByClass;
}
```

**Step 2: Update main to build and output the data**

Replace the processing loop with:

```javascript
  const output = {};

  // Process each whitelisted stat
  for (const [statId, config] of Object.entries(STAT_WHITELIST)) {
    console.log(`Processing: ${config.name}`);

    const tiers = buildTiersForStat(mods, config, ITEM_CLASSES);
    const classCount = Object.keys(tiers).length;

    if (classCount > 0) {
      output[statId] = {
        text: config.name,
        tiers: tiers,
      };
      console.log(`  -> ${classCount} item classes with tiers`);
    } else {
      console.log(`  -> No tiers found (skipping)`);
    }
  }

  // Write output
  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(`\nWritten to ${OUTPUT_PATH}`);
  console.log(`Total stats: ${Object.keys(output).length}`);
```

**Step 3: Run and verify output file is created**

```bash
bun run generate-tiers
cat src/data/tiers.json | head -50
```

Expected: JSON output with tier data for each stat.

**Step 4: Commit**

```bash
git add scripts/generate-tier-data.js src/data/tiers.json
git commit -m "feat: generate tier data for whitelisted stats"
```

---

## Task 6: Write Tests for Generated Data

**Files:**
- Create: `scripts/generate-tier-data.test.js`

**Step 1: Create test file**

```javascript
// scripts/generate-tier-data.test.js
import { expect, test, describe } from 'bun:test';
import fs from 'fs';

const TIERS_PATH = 'src/data/tiers.json';

describe('generated tier data', () => {
  const tiers = JSON.parse(fs.readFileSync(TIERS_PATH, 'utf-8'));

  test('has physical damage to attacks stat', () => {
    expect(tiers['explicit.stat_3032590688']).toBeDefined();
    expect(tiers['explicit.stat_3032590688'].text).toBe('Physical Damage to Attacks');
  });

  test('physical damage has Gloves tiers', () => {
    const glovesTiers = tiers['explicit.stat_3032590688']?.tiers?.Gloves;
    expect(glovesTiers).toBeDefined();
    expect(glovesTiers.length).toBeGreaterThan(0);
  });

  test('tier 1 is highest level requirement', () => {
    const glovesTiers = tiers['explicit.stat_3032590688']?.tiers?.Gloves;
    if (glovesTiers && glovesTiers.length > 1) {
      expect(glovesTiers[0].ilvl).toBeGreaterThanOrEqual(glovesTiers[1].ilvl);
    }
  });

  test('avgMin is calculated correctly for damage stats', () => {
    const glovesTiers = tiers['explicit.stat_3032590688']?.tiers?.Gloves;
    if (glovesTiers && glovesTiers[0]) {
      const tier = glovesTiers[0];
      if (Array.isArray(tier.min)) {
        // For damage range stats: avgMin = (min[0] + min[1]) / 2
        expect(tier.avgMin).toBe((tier.min[0] + tier.min[1]) / 2);
      }
    }
  });

  test('has resistance stats', () => {
    expect(tiers['explicit.stat_3372524247']).toBeDefined(); // Fire
    expect(tiers['explicit.stat_4220027924']).toBeDefined(); // Cold
    expect(tiers['explicit.stat_1671376347']).toBeDefined(); // Lightning
  });

  test('has attribute stats', () => {
    expect(tiers['explicit.stat_4080418644']).toBeDefined(); // Strength
    expect(tiers['explicit.stat_3261801346']).toBeDefined(); // Dexterity
    expect(tiers['explicit.stat_328541901']).toBeDefined();  // Intelligence
  });
});
```

**Step 2: Run tests**

```bash
bun test scripts/generate-tier-data.test.js
```

Expected: All tests pass.

**Step 3: Commit**

```bash
git add scripts/generate-tier-data.test.js
git commit -m "test: add tests for generated tier data"
```

---

## Task 7: DOM Exploration with Playwriter

**Goal:** Understand trade site structure to determine injection points.

**Step 1: Connect Playwriter to trade site**

Ask user to:
1. Open https://www.pathofexile.com/trade2/search/poe2/Standard
2. Click Playwriter extension icon on that tab
3. Add a stat filter (e.g., Physical Damage to Attacks)

**Step 2: Take accessibility snapshot of filter area**

```javascript
const snapshot = await accessibilitySnapshot({ page, search: /Physical Damage/i });
console.log(snapshot);
```

**Step 3: Identify key selectors**

Look for:
- Stat filter row container
- Min input field
- Stat label text

**Step 4: Document findings**

Add findings to design doc or create new `docs/plans/2026-01-03-dom-exploration.md`.

**Step 5: Commit documentation**

```bash
git add docs/plans/
git commit -m "docs: add DOM exploration findings for tier dropdown injection"
```

---

## Task 8: Create TierDropdown Component

**Files:**
- Create: `src/components/tiers/TierDropdown.tsx`
- Create: `src/components/tiers/index.ts`

**Step 1: Create the component**

```tsx
// src/components/tiers/TierDropdown.tsx
import React, { useState } from 'react';

interface TierInfo {
  tier: number;
  name: string;
  min: number | number[];
  max: number | number[];
  avgMin: number;
  ilvl: number;
}

interface TierDropdownProps {
  tiers: TierInfo[];
  onSelect: (avgMin: number) => void;
}

export function TierDropdown({ tiers, onSelect }: TierDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!tiers || tiers.length === 0) return null;

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-2 py-1 text-xs bg-poe-bg border border-poe-border rounded hover:bg-poe-hover"
        title="Select tier"
      >
        T▾
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 bg-poe-bg border border-poe-border rounded shadow-lg min-w-[150px]">
          {tiers.map((tier) => (
            <button
              key={tier.tier}
              onClick={() => {
                onSelect(tier.avgMin);
                setIsOpen(false);
              }}
              className="w-full px-3 py-1 text-left text-xs hover:bg-poe-hover flex justify-between"
            >
              <span>T{tier.tier} {tier.name}</span>
              <span className="text-poe-muted">({tier.avgMin}+)</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Create index export**

```tsx
// src/components/tiers/index.ts
export { TierDropdown } from './TierDropdown';
```

**Step 3: Commit**

```bash
git add src/components/tiers/
git commit -m "feat: add TierDropdown component"
```

---

## Task 9: Create Storybook Story

**Files:**
- Create: `stories/TierDropdown.stories.tsx`

**Step 1: Create the story**

```tsx
// stories/TierDropdown.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { TierDropdown } from '../src/components/tiers';

const meta: Meta<typeof TierDropdown> = {
  title: 'Components/TierDropdown',
  component: TierDropdown,
};

export default meta;
type Story = StoryObj<typeof TierDropdown>;

const mockPhysDamageTiers = [
  { tier: 1, name: 'Flaring', min: [12, 22], max: [19, 32], avgMin: 17, ilvl: 75 },
  { tier: 2, name: 'Tempered', min: [10, 18], max: [15, 26], avgMin: 14, ilvl: 65 },
  { tier: 3, name: 'Heavy', min: [8, 14], max: [12, 20], avgMin: 11, ilvl: 52 },
  { tier: 4, name: 'Sharpened', min: [6, 10], max: [9, 15], avgMin: 8, ilvl: 40 },
];

export const Default: Story = {
  args: {
    tiers: mockPhysDamageTiers,
    onSelect: (avgMin) => console.log('Selected tier with avgMin:', avgMin),
  },
};

export const SingleValueStat: Story = {
  args: {
    tiers: [
      { tier: 1, name: 'of the Inferno', min: 46, max: 50, avgMin: 46, ilvl: 75 },
      { tier: 2, name: 'of the Volcano', min: 36, max: 45, avgMin: 36, ilvl: 60 },
      { tier: 3, name: 'of the Furnace', min: 24, max: 35, avgMin: 24, ilvl: 45 },
    ],
    onSelect: (avgMin) => console.log('Selected tier with avgMin:', avgMin),
  },
};
```

**Step 2: Run Storybook and verify**

```bash
bun run storybook
```

Navigate to Components/TierDropdown and verify it works.

**Step 3: Commit**

```bash
git add stories/TierDropdown.stories.tsx
git commit -m "feat: add TierDropdown Storybook story"
```

---

## Task 10: Load Tier Data in Extension

**Files:**
- Create: `src/services/tierData.ts`

**Step 1: Create tier data service**

```typescript
// src/services/tierData.ts
import tiersData from '../data/tiers.json';

interface TierInfo {
  tier: number;
  name: string;
  min: number | number[];
  max: number | number[];
  avgMin: number;
  ilvl: number;
}

interface StatTiers {
  text: string;
  tiers: Record<string, TierInfo[]>;
}

type TiersData = Record<string, StatTiers>;

const tiers: TiersData = tiersData as TiersData;

export function getTiersForStat(statId: string, itemClass?: string): TierInfo[] | null {
  const statTiers = tiers[statId];
  if (!statTiers) return null;

  if (itemClass && statTiers.tiers[itemClass]) {
    return statTiers.tiers[itemClass];
  }

  // Return first available item class if no specific one requested
  const firstClass = Object.keys(statTiers.tiers)[0];
  return firstClass ? statTiers.tiers[firstClass] : null;
}

export function hasStatTiers(statId: string): boolean {
  return statId in tiers;
}

export function getStatText(statId: string): string | null {
  return tiers[statId]?.text ?? null;
}
```

**Step 2: Commit**

```bash
git add src/services/tierData.ts
git commit -m "feat: add tier data service"
```

---

## Task 11: DOM Injection Implementation

**Note:** This task depends on DOM exploration findings from Task 7.

**Files:**
- Create: `src/services/tierInjector.ts`

**Step 1: Create injector service (template - adjust based on DOM findings)**

```typescript
// src/services/tierInjector.ts
import { getTiersForStat, hasStatTiers } from './tierData';

export function injectTierDropdowns() {
  // TODO: Implement based on DOM exploration findings
  // This will:
  // 1. Find stat filter rows on the page
  // 2. Extract stat ID from each row
  // 3. If stat has tier data, inject TierDropdown next to min field
  // 4. Connect dropdown selection to min input value

  console.log('[TierInjector] Ready to inject tier dropdowns');
}

export function observeFilterChanges(callback: () => void) {
  // Watch for new filters being added
  const observer = new MutationObserver(callback);

  // TODO: Target the correct container based on DOM exploration
  const filterContainer = document.querySelector('.filter-container');
  if (filterContainer) {
    observer.observe(filterContainer, { childList: true, subtree: true });
  }

  return observer;
}
```

**Step 2: Commit**

```bash
git add src/services/tierInjector.ts
git commit -m "feat: add tier injector service skeleton"
```

---

## Task 12: Update CLAUDE.md with Update Instructions

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Add tier data update instructions**

Add a new section after the Commands section:

```markdown
## Updating Data Files

### Stats Data
```bash
bun run update-stats  # Fetch latest stats.json from PoE trade APIs
```

### Tier Data
```bash
bun run generate-tiers  # Regenerate tier data from mods.json
```

**When to update:**
- After major PoE patches that change mod tiers
- Requires `tests/fixtures/mods.json` (download from poe-mods data source)
```

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add tier data update instructions to CLAUDE.md"
```

---

## Summary

After completing these tasks, you will have:

1. ✅ Generation script (`scripts/generate-tier-data.js`)
2. ✅ Generated tier data (`src/data/tiers.json`)
3. ✅ Tests for generated data
4. ✅ TierDropdown React component
5. ✅ Storybook story for visual testing
6. ✅ Tier data service
7. ✅ Injector service skeleton (needs DOM findings)
8. ✅ Updated documentation

**Remaining work after this plan:**
- Complete DOM exploration (Task 7) to finalize injection selectors
- Finish tierInjector.ts implementation
- Integration testing on live trade site
- Handle edge cases (no item class selected, etc.)
