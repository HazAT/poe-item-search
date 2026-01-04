# Resistance Search Fix Design

## Problem

Two issues with current resistance search implementation:

1. **Using pseudo stats instead of explicit stats** - Changed in commit `81985f3` to use pseudo total resistance stats (e.g., `pseudo.pseudo_total_fire_resistance`), but we want to search for actual resistance modifiers using explicit stat IDs.

2. **Missing group minimum value** - The weighted filter group has no `value: { min: totalWeight }`, so the weighted sum requirement is effectively ignored. This was lost when commit `daa66cf` changed the type back to `weight` but didn't restore the group minimum.

## Solution

Revert resistance handling to use explicit stat IDs in a weighted group with:
- Found resistances: enabled with `weight: 1` and their actual values as `min`
- Missing resistances: disabled with `weight: 1` (QoL feature to quickly adapt search)
- Group minimum: sum of all found resistance values

### Example Output

For an item with +45% Fire and +30% Cold resistance:

```javascript
{
  type: "weight",
  filters: [
    { id: "explicit.stat_3372524247", value: { weight: 1, min: 45 }, disabled: false },  // Fire
    { id: "explicit.stat_4220027924", value: { weight: 1, min: 30 }, disabled: false },  // Cold
    { id: "explicit.stat_1671376347", value: { weight: 1 }, disabled: true },            // Lightning
    { id: "explicit.stat_2923486259", value: { weight: 1 }, disabled: true }             // Chaos
  ],
  value: { min: 75 }  // 45 + 30 = 75
}
```

## Implementation

### File: `src/item.js`

1. Remove the `resistanceMapping` object (no longer need pseudo stat mapping)
2. Update resistance filter building to:
   - Define all four resistance IDs upfront
   - Loop through found resistances, accumulate `totalWeight`, add as enabled
   - Loop through all resistance IDs, add missing ones as disabled
   - Add `value: { min: totalWeight }` to the group

### Tests: `src/item.test.js`

Update existing resistance tests to expect:
- Explicit stat IDs instead of pseudo IDs
- Disabled filters for missing resistances
- Group `value: { min: totalWeight }`

## Resistance Stat IDs

| Resistance | Explicit Stat ID |
|------------|------------------|
| Fire | `explicit.stat_3372524247` |
| Cold | `explicit.stat_4220027924` |
| Lightning | `explicit.stat_1671376347` |
| Chaos | `explicit.stat_2923486259` |
