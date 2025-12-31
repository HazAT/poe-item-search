// Utility to parse sort objects into human-readable labels

export interface SortLabelResult {
  label: string;
  direction: "asc" | "desc";
}

/**
 * Parse a sort object and return a human-readable label.
 * Returns null for default sort (price ascending) since it doesn't need to be displayed.
 */
export function getSortLabel(sort?: Record<string, string>): SortLabelResult | null {
  if (!sort) return null;

  const entries = Object.entries(sort);
  if (entries.length === 0) return null;

  const [key, direction] = entries[0];

  // Default sort is price ascending - don't show badge
  if (key === "price" && direction === "asc") {
    return null;
  }

  const label = parseSortKey(key);
  return {
    label,
    direction: direction as "asc" | "desc",
  };
}

/**
 * Parse a sort key into a readable label.
 * Examples:
 * - "price" → "Price"
 * - "dps" → "DPS"
 * - "stat.explicit.stat_3299347043" → "Stat"
 * - "item.armour" → "Armour"
 */
function parseSortKey(key: string): string {
  // Known sort keys
  const knownKeys: Record<string, string> = {
    price: "Price",
    dps: "DPS",
    pdps: "pDPS",
    edps: "eDPS",
    "item.armour": "Armour",
    "item.evasion": "Evasion",
    "item.energy_shield": "ES",
    "item.level": "Level",
    "item.quality": "Quality",
    "item.stack_size": "Stack",
    "item.gem_level": "Gem Lvl",
  };

  if (knownKeys[key]) {
    return knownKeys[key];
  }

  // Stat-based sorts
  if (key.startsWith("stat.")) {
    return "Stat";
  }

  // Item property sorts
  if (key.startsWith("item.")) {
    const prop = key.replace("item.", "");
    return prop.charAt(0).toUpperCase() + prop.slice(1).replace(/_/g, " ");
  }

  // Fallback: capitalize first letter
  return key.charAt(0).toUpperCase() + key.slice(1);
}

/**
 * Format sort label with direction arrow for display.
 * Example: { label: "Price", direction: "desc" } → "Price ↓"
 */
export function formatSortBadge(result: SortLabelResult): string {
  const arrow = result.direction === "asc" ? "↑" : "↓";
  return `${result.label} ${arrow}`;
}
