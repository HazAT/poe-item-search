# DOM Exploration Findings - PoE Trade Site Stat Filters

## Overview

Explored the PoE trade2 site (pathofexile.com/trade2) to understand the DOM structure for injecting tier dropdowns.

## Stat Filter Structure

Each stat filter in the "Stat Filters" group has this structure:

```html
<div class="filter full-span">
  <span class="input-group-btn">
    <button class="btn toggle-btn"></button>
  </span>
  <span class="filter-body">
    <div class="filter-title filter-title-clickable">
      <i class="mutate-type mutate-type-explicit">explicit</i>
      <span>Adds # to # Physical Damage to Attacks</span>
    </div>
    <span class="sep"></span>
    <input type="number" placeholder="min" class="form-control minmax">
    <span class="sep"></span>
    <input type="number" placeholder="max" class="form-control minmax">
  </span>
  <span class="input-group-btn">
    <button class="btn remove-btn"></button>
  </span>
</div>
```

## Key Selectors

| Element | Selector | Description |
|---------|----------|-------------|
| Stat Filters group | `.filter-group` with header "Stat Filters" | Container for all stat filters |
| Stat filter row | `.filter.full-span` | Individual stat filter |
| Stat type badge | `.mutate-type` | Contains "explicit", "implicit", etc. |
| Stat display text | `.filter-title span` | Human-readable stat name |
| Min input | `input.minmax[placeholder="min"]` | User enters minimum value |
| Max input | `input.minmax[placeholder="max"]` | User enters maximum value |

## Vue Component Data Access

The site uses Vue.js. Each filter element has Vue component data accessible via:

```javascript
const filterElement = document.querySelector('.filter.full-span');
const vue = filterElement.__vue__;

// Get stat ID (trade API ID)
const statId = vue.$props.filter.id;  // e.g., "explicit.stat_3032590688"

// Get current min value
const currentMin = vue.$props.state.min;

// Get display text
const displayText = vue.$data.lastMutable.text;  // e.g., "Adds # to # Physical Damage to Attacks"
```

## Injection Strategy

**Location**: Insert tier dropdown button after the min input field.

```javascript
// Find min input
const minInput = filterElement.querySelector('input[placeholder="min"]');

// Create and insert tier dropdown after min input
const tierBtn = document.createElement('button');
tierBtn.className = 'tier-dropdown-btn';
minInput.after(tierBtn);
```

**Styling considerations**:
- Match PoE trade site button styling
- Use similar colors/fonts
- Keep compact to not break layout

## Detecting Item Class Context

To show item-class-specific tiers, we need to detect the current item category filter:

```javascript
// Find Type Filters group
const typeFilters = document.querySelector('.filter-group'); // First group is Type Filters
const categorySelect = typeFilters.querySelector('.filter-select');
const selectedCategory = categorySelect?.querySelector('.multiselect__single')?.textContent;
// e.g., "Gloves", "Rings", etc.
```

## Listening for Filter Changes

Use MutationObserver to detect when new stat filters are added:

```javascript
const statFiltersGroup = /* find Stat Filters group */;
const observer = new MutationObserver((mutations) => {
  // Check for new filter elements and inject tier dropdowns
});
observer.observe(statFiltersGroup, { childList: true, subtree: true });
```

## Notes

- The site is a Vue.js application
- Stat IDs are available via Vue component props
- No data attributes on DOM elements for stat IDs
- Must access `__vue__` property to get stat metadata
