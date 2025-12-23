---
name: poe-item-search
description: Use when you need to search for Path of Exile items on the trade website, convert item text to trade API queries, or help users find similar items
---

# PoE Item Search Skill

This skill allows you to convert copied Path of Exile item text into trade API search queries.

## When to Use

- User pastes a PoE item (copied with Ctrl+C in game)
- User wants to search for similar items on trade
- User asks about item stats or values
- User wants to price check an item

## How to Use

### 1. Import the module

```javascript
import { buildSearchQuery, buildTradeRequest, getUniqueItemName } from './src/search.js';
```

### 2. Build a search query from item text

```javascript
// Basic usage - fetches stats from API automatically
const query = await buildSearchQuery(itemText);

// With options
const query = await buildSearchQuery(itemText, {
  poe2: true,        // Use PoE 2 API (default: true)
  forceRefresh: false // Force refresh stats cache
});
```

### 3. Build a complete trade API request

```javascript
const request = await buildTradeRequest(itemText);
// Returns:
// {
//   query: {
//     status: { option: "online" },
//     stats: [...],
//     term: "ItemName" // only for uniques
//   },
//   sort: { price: "asc" }
// }
```

### 4. Check if item is unique

```javascript
const uniqueName = getUniqueItemName(itemText);
// Returns item name if unique, undefined otherwise
```

## Trade API Endpoints

- **PoE 2**: `POST https://www.pathofexile.com/api/trade2/search/{league}`
- **PoE 1**: `POST https://www.pathofexile.com/api/trade/search/{league}`

Common leagues: `Standard`, `League` (current temp league)

## Example Item Text Format

Items copied from the game look like this:

```
Item Class: Gloves
Rarity: Rare
Tempest Talons
Knightly Mitts
--------
Quality: +20% (augmented)
Armour: 146 (augmented)
--------
Requires: Level 65, 80 Str
--------
Item Level: 82
--------
+39% to Cold Resistance
+40% to Fire Resistance
```

## Query Output Format

The query uses pseudo stats for resistances:
- `pseudo.pseudo_total_fire_resistance`
- `pseudo.pseudo_total_cold_resistance`
- `pseudo.pseudo_total_lightning_resistance`
- `pseudo.pseudo_total_chaos_resistance`

Other stats use explicit IDs like `explicit.stat_XXXXXXX`.

## Testing

Run tests with:
```bash
bun test src/search.test.js
```

## Files

- `src/search.js` - Main module with agent capability functions
- `src/item.js` - Core item parsing and query building logic
- `src/stat.js` - Stat regex generation
- `tests/fixtures/` - Sample items and stats data for testing
