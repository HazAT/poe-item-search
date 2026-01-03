# Tier-Based Modifier Filtering

## Overview

Allow users to select modifier tiers (T1, T2, etc.) instead of manually entering min/max values on the PoE trade website. When a tier is selected, the min field is auto-populated with the tier's minimum average value.

**Problem**: The trade site only supports min/max value searches, but players often want to search for specific tiers (e.g., "T1 Physical Damage only"). Currently this requires knowing the exact roll ranges.

**Solution**: Add a tier dropdown next to the min field for supported stats that shows available tiers with their roll ranges.

## Data Flow

```
mods.json + stats.json  →  generate-tier-data.js  →  src/data/tiers.json
                                                            ↓
                              Trade site filter UI  ←  Extension injects dropdown
                                                            ↓
                              User selects tier  →  Min field populated
```

## Data Structure

### Generated tiers.json format

```json
{
  "explicit.stat_3032590688": {
    "text": "Adds # to # Physical Damage to Attacks",
    "tiers": {
      "Gloves": [
        { "tier": 1, "name": "Flaring", "min": [12, 22], "max": [19, 32], "avgMin": 17, "ilvl": 75 },
        { "tier": 2, "name": "Tempered", "min": [10, 18], "max": [15, 26], "avgMin": 14, "ilvl": 65 },
        { "tier": 9, "name": "Glinting", "min": [1, 3], "max": [2, 3], "avgMin": 2, "ilvl": 1 }
      ],
      "Rings": [ ... ],
      "Quivers": [ ... ]
    }
  },
  "explicit.stat_3372524247": {
    "text": "+#% to Fire Resistance",
    "tiers": {
      "Gloves": [
        { "tier": 1, "name": "of the Inferno", "min": 46, "max": 50, "avgMin": 46, "ilvl": 75 }
      ]
    }
  }
}
```

### Fields

- `tier`: 1 = best (highest rolls), ascending - matches in-game convention
- `name`: In-game affix name (Flaring, Tempered, etc.)
- `min`/`max`: Roll ranges (array for "X to Y" stats, single value otherwise)
- `avgMin`: Pre-calculated minimum for search ((min[0] + min[1]) / 2 for ranges)
- `ilvl`: Item level required to roll this tier

## Generation Script

### Location

`scripts/generate-tier-data.js` → outputs to `src/data/tiers.json`

### Whitelist Approach

Script only processes a whitelist of stat IDs. This keeps the output focused and allows incremental expansion.

```javascript
const STAT_WHITELIST = {
  // Damage to Attacks
  "explicit.stat_3032590688": "attack_minimum_added_physical_damage",
  "explicit.stat_1573130764": "attack_minimum_added_fire_damage",
  "explicit.stat_4067062424": "attack_minimum_added_cold_damage",
  "explicit.stat_1334060246": "attack_minimum_added_lightning_damage",
  "explicit.stat_2831165374": "attack_minimum_added_chaos_damage",

  // Offensive
  "explicit.stat_681332047": "attack_speed_+%",
  "explicit.stat_587431675": "critical_strike_chance_+%",
  "explicit.stat_3556824919": "critical_strike_multiplier_+",
  "explicit.stat_803737631": "accuracy_rating",

  // Resistances
  "explicit.stat_3372524247": "fire_resistance_%",
  "explicit.stat_4220027924": "cold_resistance_%",
  "explicit.stat_1671376347": "lightning_resistance_%",
  "explicit.stat_2923486259": "chaos_resistance_%",

  // Attributes
  "explicit.stat_4080418644": "strength",
  "explicit.stat_3261801346": "dexterity",
  "explicit.stat_328541901": "intelligence",

  // +Level to Skills (IDs to be determined)
};
```

### Package.json Script

```json
"generate-tiers": "bun scripts/generate-tier-data.js"
```

## UI/UX Design

### Dropdown Placement

Small dropdown button next to min input field for supported stats only.

```
┌─────────────────────────────────────────────────────────────┐
│ Adds # to # Physical Damage to Attacks                      │
│                                                             │
│   Min: [  17  ] [T▾]     Max: [      ]                     │
│              │                                              │
│              └──┬──────────────────┐                        │
│                 │ T1 Flaring (17+) │ ← Selected             │
│                 │ T2 Tempered (14+)│                        │
│                 │ T3 Heavy (11+)   │                        │
│                 │ ...              │                        │
│                 └──────────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

### Behavior

1. Dropdown only appears for stats in our tier data
2. Shows tiers available for the current item class filter (context-aware)
3. Selecting a tier fills the min field with `avgMin` value
4. User can still manually edit the min field after selection
5. If no item class filter set, show all tiers or most common item class

### Fallback

If stat has no tier data, dropdown is hidden (no UI clutter).

## Implementation Tasks

### Phase 1: Data Generation

1. Create `scripts/generate-tier-data.js`
2. Build stat ID mapping (trade API ↔ game data internal IDs)
3. Parse mods.json to extract tier info per item class
4. Output to `src/data/tiers.json`
5. Add `generate-tiers` script to package.json
6. Document update process in CLAUDE.md

### Phase 2: DOM Exploration

1. Use Playwriter to inspect trade site filter structure
2. Find reliable way to identify stat filter rows
3. Determine injection point for tier dropdown
4. Test on both `/trade` and `/trade2`

### Phase 3: UI Implementation

1. Create `TierDropdown` component
2. Detect current item class from page filters
3. Inject dropdown next to min field for supported stats
4. Handle tier selection → populate min value
5. Style to match trade site aesthetic

### Phase 4: Testing

1. Test all whitelisted stat types
2. Test across different item classes
3. Verify tier values match in-game expectations
4. Test edge cases (no item class selected, etc.)

## Data Sources

- `tests/fixtures/mods.json` (11MB) - Complete mod database with tier info
- `tests/fixtures/mods_by_base.json` (3MB) - Mods organized by item class
- `tests/fixtures/stats.json` - Trade API stat ID definitions

## Notes

- Tier numbering: T1 = Best (highest rolls), matching in-game convention
- Item-class aware: Different item types may have different tier availability
- The mapping between trade API stat IDs and game data stat IDs requires text pattern matching
- DOM exploration needed before UI implementation to find reliable injection points
