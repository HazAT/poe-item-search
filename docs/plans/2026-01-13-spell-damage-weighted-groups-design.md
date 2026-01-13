# Spell Damage Weighted Groups Design

## Overview

Add three new weighted sum groups for spell/damage-related stats, similar to existing resistance and attribute groups.

## The Three Groups

### Group 1: Increased Spell Damage (6 stats)

| Stat | ID |
|------|-----|
| #% increased Spell Damage | `stat_2974417149` |
| #% increased Fire Damage | `stat_3962278098` |
| #% increased Cold Damage | `stat_3291658075` |
| #% increased Lightning Damage | `stat_2231156303` |
| #% increased Chaos Damage | `stat_736967255` |
| #% increased Spell Physical Damage | `stat_2768835289` |

### Group 2: Gain as Extra Damage (5 stats)

| Stat | ID |
|------|-----|
| Gain #% of Damage as Extra Fire Damage | `stat_3015669065` |
| Gain #% of Damage as Extra Cold Damage | `stat_2505884597` |
| Gain #% of Damage as Extra Lightning Damage | `stat_3278136794` |
| Gain #% of Damage as Extra Chaos Damage | `stat_3398787959` |
| Gain #% of Damage as Extra Physical Damage | `stat_4019237939` |

### Group 3: Attacks Gain as Extra Damage (3 stats)

| Stat | ID |
|------|-----|
| Attacks Gain #% of Damage as Extra Fire Damage | `stat_1049080093` |
| Attacks Gain #% of Damage as Extra Cold Damage | `stat_1484500028` |
| Attacks Gain #% of Physical Damage as extra Chaos Damage | `stat_261503687` |

## Implementation

### Approach

Follow the existing pattern in `src/item.js` for resistances and attributes:

1. Define stat ID maps at the top of the file
2. Filter matched stats into three new groups
3. Exclude grouped stats from the regular "and" filter
4. Build weighted filters for each group:
   - Found stats: `weight: 1` with `min` value
   - Missing stats: `weight: 1` with `disabled: true`
   - Group total: sum of found values
5. Add each group as a separate `type: "weight"` entry to statsArray

### Files to Modify

- `src/item.js` - Add stat ID maps, filtering logic, and weighted filter building
- `src/item.test.js` - Add test cases

## Testing

### staff1.txt - Increased Spell Damage Group

- `40% increased Spell Damage` + `137% increased Cold Damage` = weighted sum min of 177
- Fire, Lightning, Chaos, Spell Physical appear as `disabled: true`

### staff2.txt - Gain as Extra Damage Group

- `Gain 54% of Damage as Extra Fire Damage` + `Gain 53% of Damage as Extra Cold Damage` = weighted sum min of 107
- Lightning, Chaos, Physical appear as `disabled: true`
