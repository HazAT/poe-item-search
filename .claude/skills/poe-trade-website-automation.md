---
name: poe-trade-website-automation
description: Use when automating the Path of Exile trade website with playwriter/browser automation, pasting items, reading search results, or interacting with stat filters
---

# PoE Trade Website Automation

Reference for automating the PoE trade website (`pathofexile.com/trade2`) using playwriter MCP.

## URL Structure

```
https://www.pathofexile.com/trade2/search/poe2/{league}
https://www.pathofexile.com/trade2/search/poe2/{league}/{search_id}
```

Leagues: `Standard`, `Fate%20of%20the%20Vaal` (current temp league, URL-encoded)

## Key UI Elements

| Element | Selector | Purpose |
|---------|----------|---------|
| Item name search | `textbox "Search Items..."` | Search by item name |
| Paste input | `textbox "Paste in-game item here..."` | Extension-injected paste field |
| League dropdown | Contains league name text | Select league |
| Search button | `button "Search"` | Execute search |
| Clear button | `button "Clear"` | Reset all filters |
| Stat Filters section | `generic "Stat Filters"` | Container for stat filters |
| Add Stat Filter | `textbox "+ Add Stat Filter"` | Add new stat to filter |
| Add Stat Group | `textbox "+ Add Stat Group"` | Add new stat group |

## Pasting Items

The extension listens for paste events on the paste input field:

```javascript
// Simulate paste with ClipboardEvent
const pasteInput = page.locator('input[placeholder*="Paste"]');
await pasteInput.click();
await pasteInput.evaluate((el, text) => {
  el.value = '';
  const event = new ClipboardEvent('paste', {
    clipboardData: new DataTransfer(),
    bubbles: true
  });
  event.clipboardData.setData('text/plain', text);
  el.dispatchEvent(event);
}, itemText);
```

**Note:** `fill()` alone won't trigger the search - you must dispatch a paste event.

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/trade2/data/stats` | GET | Stat definitions with IDs |
| `/api/trade2/data/filters` | GET | Filter options (categories, etc.) |
| `/api/trade2/search/poe2/{league}` | POST | Execute search, returns search ID |
| `/api/trade2/fetch/{league}` | POST | Fetch item details by result IDs |

## Search Query Structure

```json
{
  "query": {
    "term": "Unique Item Name",
    "status": { "option": "online" },
    "filters": {
      "type_filters": {
        "filters": {
          "category": { "option": "armour.chest" }
        }
      }
    },
    "stats": [
      {
        "type": "and",
        "filters": [
          { "id": "explicit.stat_3299347043", "value": { "min": 92 } }
        ]
      },
      {
        "type": "weight",
        "filters": [
          { "id": "pseudo.pseudo_total_cold_resistance", "value": { "min": 21 } }
        ]
      }
    ]
  }
}
```

## Stat Filter Types

| Type | Use Case |
|------|----------|
| `and` | All filters must match |
| `count` | N of M filters must match |
| `weight` | Weighted sum of stat values |

## Common Stat ID Prefixes

- `explicit.stat_*` - Explicit mods
- `implicit.stat_*` - Implicit mods
- `pseudo.pseudo_total_*` - Combined stats (resistances, attributes)

## Monitoring Network Requests

```javascript
state.requests = [];
page.on('request', req => {
  if (req.url().includes('/api/trade')) {
    state.requests.push({
      url: req.url(),
      method: req.method(),
      postData: req.postData()
    });
  }
});

// ... perform actions ...

// Check captured requests
state.requests.forEach(r => console.log(r.method, r.url));

// Cleanup
page.removeAllListeners('request');
```

## Reading Stat Filters from UI

After a search, stat filters appear in the UI:

```javascript
// Get accessibility snapshot of stat filters area
const snapshot = await accessibilitySnapshot({ page, search: /Stat Filters/i });
console.log(snapshot);
```

Stat filter entries have structure:
- Stat name text (e.g., `"# to maximum Life"`)
- Min value spinbutton
- Max value spinbutton
- Delete button

## Item Text Format

Items copied from PoE have this structure:

```
Item Class: Body Armours
Rarity: Rare
Item Name
Base Type Name
--------
[property]: [value]
--------
Requirements:
Level: X
[Attr]: Y
--------
Item Level: Z
--------
[stat line]
[stat line] (implicit)
```

## Category Mappings

| Item Class | API Category |
|------------|--------------|
| Body Armours | `armour.chest` |
| Helmets | `armour.helmet` |
| Gloves | `armour.gloves` |
| Boots | `armour.boots` |
| Rings | `accessory.ring` |
| Amulets | `accessory.amulet` |
| Belts | `accessory.belt` |
| Wands | `weapon.wand` |
| Quarterstaves | `weapon.warstaff` |

See `src/itemClass.js` for complete mapping.

## Pseudo Stats for Resistances

The extension converts explicit resistance stats to pseudo stats:

| Explicit Stat | Pseudo Stat |
|---------------|-------------|
| Fire Resistance | `pseudo.pseudo_total_fire_resistance` |
| Cold Resistance | `pseudo.pseudo_total_cold_resistance` |
| Lightning Resistance | `pseudo.pseudo_total_lightning_resistance` |
| Chaos Resistance | `pseudo.pseudo_total_chaos_resistance` |

## Troubleshooting

**Paste not triggering search:**
- Ensure you dispatch a ClipboardEvent, not just fill()
- Check that the extension is loaded (look for paste input field)

**Search returns no results:**
- Stat values may be too restrictive
- Try reducing min values or removing some filters

**Page not responding:**
- Call `mcp__playwriter__reset` to reconnect
- User may need to refresh the page
