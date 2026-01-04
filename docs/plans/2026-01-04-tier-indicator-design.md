# Tier Indicator Based on Min Value

## Overview

Enhance the tier dropdown to show which tier the current min input value represents, rather than always showing a generic "T▾".

## Behavior

When a tier dropdown is injected into a stat filter:
1. Read the current min input value
2. Determine which tier that value falls into using range-based matching
3. Display "T2" (or appropriate tier number) if matched, otherwise "T▾"

### Range-Based Matching

A value belongs to tier N if: `value >= tierN.avgMin && value < tier(N-1).avgMin`

The `avgMin` field works for both stat types:
- **Single-value stats** (resistances): `avgMin` equals `min`
- **Dual-value stats** (physical damage): `avgMin` is the average of the two min values

### Examples

**Fire Resistance on Rings:**
```
T1: avgMin = 41
T2: avgMin = 36
T3: avgMin = 31
```

| Min Value | Tier Match | Button Shows |
|-----------|------------|--------------|
| 38        | T2         | T2           |
| 41        | T1         | T1           |
| 15        | none       | T▾           |
| (empty)   | none       | T▾           |

## Implementation

### tierData.ts

Add function:
```typescript
findTierForValue(statId: string, value: number, itemClass?: string): number | null
```
Returns tier number if value falls within a tier's range, null otherwise.

### TierDropdown.tsx

- Add prop: `currentValue?: number`
- Button displays "T{n}" when tier found, "T▾" when not
- Clicking still opens the dropdown as before

### tierInjector.ts

- Read initial min input value when injecting
- Pass value to TierDropdown as `currentValue`
- Observe input changes (input/change events) to re-render with updated value
