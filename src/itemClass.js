/**
 * Item Class extraction and mapping to trade API categories
 *
 * Maps in-game item class names to trade API category filter options
 * Can fetch categories dynamically from the trade API
 */

import { debug } from "@/utils/debug";

// Cache for fetched categories
let cachedCategories = null;
let cacheTimestamp = 0;
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

/**
 * Fallback mapping from in-game item class names to trade API category IDs
 * Used when API is unavailable
 */
export const ITEM_CLASS_TO_CATEGORY = {
  // Weapons - One-Handed Melee
  "Claws": "weapon.claw",
  "Daggers": "weapon.dagger",
  "One Hand Swords": "weapon.onesword",
  "One Hand Axes": "weapon.oneaxe",
  "One Hand Maces": "weapon.onemace",
  "Spears": "weapon.spear",
  "Flails": "weapon.flail",

  // Weapons - Two-Handed Melee
  "Two Hand Swords": "weapon.twosword",
  "Two Hand Axes": "weapon.twoaxe",
  "Two Hand Maces": "weapon.twomace",
  "Quarterstaves": "weapon.warstaff",

  // Weapons - Ranged
  "Bows": "weapon.bow",
  "Crossbows": "weapon.crossbow",

  // Weapons - Caster
  "Wands": "weapon.wand",
  "Sceptres": "weapon.sceptre",
  "Staves": "weapon.staff",

  // Weapons - Special
  "Talismans": "weapon.talisman",
  "Fishing Rods": "weapon.rod",

  // Armour
  "Helmets": "armour.helmet",
  "Body Armours": "armour.chest",
  "Gloves": "armour.gloves",
  "Boots": "armour.boots",
  "Quivers": "armour.quiver",
  "Shields": "armour.shield",
  "Foci": "armour.focus",
  "Bucklers": "armour.buckler",

  // Accessories
  "Amulets": "accessory.amulet",
  "Belts": "accessory.belt",
  "Rings": "accessory.ring",

  // Flasks
  "Life Flasks": "flask.life",
  "Mana Flasks": "flask.mana",

  // Gems
  "Skill Gems": "gem.activegem",
  "Support Gems": "gem.supportgem",
  "Meta Gems": "gem.metagem",

  // Jewels
  "Jewels": "jewel",

  // Maps/Endgame
  "Waystones": "map.waystone",
  "Map Fragments": "map.fragment",
  "Expedition Logbooks": "map.logbook",
  "Breachstones": "map.breachstone",

  // Currency
  "Runes": "currency.rune",
  "Soul Cores": "currency.soulcore",

  // Divination Cards
  "Divination Cards": "card",

  // Relics
  "Relics": "sanctum.relic",
};

/**
 * Mapping from trade API category text to in-game item class names
 * Used to build dynamic mapping from fetched data
 */
const CATEGORY_TEXT_TO_ITEM_CLASS = {
  "Quarterstaff": "Quarterstaves",
  "Claw": "Claws",
  "Dagger": "Daggers",
  "One-Handed Sword": "One Hand Swords",
  "One-Handed Axe": "One Hand Axes",
  "One-Handed Mace": "One Hand Maces",
  "Spear": "Spears",
  "Flail": "Flails",
  "Two-Handed Sword": "Two Hand Swords",
  "Two-Handed Axe": "Two Hand Axes",
  "Two-Handed Mace": "Two Hand Maces",
  "Bow": "Bows",
  "Crossbow": "Crossbows",
  "Wand": "Wands",
  "Sceptre": "Sceptres",
  "Staff": "Staves",
  "Talisman": "Talismans",
  "Fishing Rod": "Fishing Rods",
  "Helmet": "Helmets",
  "Body Armour": "Body Armours",
  "Gloves": "Gloves",
  "Boots": "Boots",
  "Quiver": "Quivers",
  "Shield": "Shields",
  "Focus": "Foci",
  "Buckler": "Bucklers",
  "Amulet": "Amulets",
  "Belt": "Belts",
  "Ring": "Rings",
  "Life Flask": "Life Flasks",
  "Mana Flask": "Mana Flasks",
  "Skill Gem": "Skill Gems",
  "Support Gem": "Support Gems",
  "Meta Gem": "Meta Gems",
  "Any Jewel": "Jewels",
  "Waystone": "Waystones",
  "Map Fragment": "Map Fragments",
  "Logbook": "Expedition Logbooks",
  "Breachstone": "Breachstones",
  "Rune": "Runes",
  "Soul Core": "Soul Cores",
  "Divination Card": "Divination Cards",
  "Relic": "Relics",
};

/**
 * Fetches category filters from the PoE trade API
 * @param {boolean} poe2 - Use PoE 2 API (default: true)
 * @returns {Promise<object[]>} Array of category options
 */
async function fetchCategories(poe2 = true) {
  const baseUrl = poe2
    ? "https://www.pathofexile.com/api/trade2/data/filters"
    : "https://www.pathofexile.com/api/trade/data/filters";

  const response = await fetch(baseUrl, {
    headers: {
      "User-Agent": "poe-item-search-agent/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch categories: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Find the type_filters and extract category options
  const typeFilters = data.result.find(f => f.id === "type_filters");
  if (!typeFilters) {
    throw new Error("type_filters not found in API response");
  }

  const categoryFilter = typeFilters.filters.find(f => f.id === "category");
  if (!categoryFilter) {
    throw new Error("category filter not found in API response");
  }

  return categoryFilter.option.options;
}

/**
 * Builds a mapping from item class names to category IDs from fetched data
 * @param {object[]} categories - Array of category options from API
 * @returns {object} Mapping of item class -> category ID
 */
function buildMappingFromCategories(categories) {
  const mapping = {};

  for (const cat of categories) {
    if (!cat.id) continue; // Skip "Any" options

    // Try to find the item class name from the text
    const itemClass = CATEGORY_TEXT_TO_ITEM_CLASS[cat.text];
    if (itemClass) {
      mapping[itemClass] = cat.id;
    }
  }

  return mapping;
}

/**
 * Gets categories, using cache if available
 * @param {object} options - Options
 * @param {boolean} options.forceRefresh - Force refresh the cache
 * @param {boolean} options.poe2 - Use PoE 2 API (default: true)
 * @returns {Promise<object>} Mapping of item class -> category ID
 */
export async function getCategories({ forceRefresh = false, poe2 = true } = {}) {
  const now = Date.now();

  if (!forceRefresh && cachedCategories && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedCategories;
  }

  try {
    const categories = await fetchCategories(poe2);
    const mapping = buildMappingFromCategories(categories);

    // Merge with static mapping (static takes precedence for known items)
    cachedCategories = { ...mapping, ...ITEM_CLASS_TO_CATEGORY };
    cacheTimestamp = now;

    return cachedCategories;
  } catch (error) {
    debug.warn("[ItemClass] Failed to fetch categories, using static mapping:", error.message);
    return ITEM_CLASS_TO_CATEGORY;
  }
}

/**
 * Clears the categories cache
 */
export function clearCategoriesCache() {
  cachedCategories = null;
  cacheTimestamp = 0;
}

/**
 * Gets the trade API category ID for an item class (async version with live fetch)
 * @param {string} itemClass - The item class name
 * @param {object} options - Options for fetching
 * @returns {Promise<string|undefined>} The category ID
 */
export async function getCategoryForItemClassAsync(itemClass, options = {}) {
  if (!itemClass) {
    return undefined;
  }

  const categories = await getCategories(options);
  return categories[itemClass];
}

/**
 * Gets the trade API category ID from item text (async version)
 * @param {string} itemText - Raw item text
 * @param {object} options - Options for fetching
 * @returns {Promise<string|undefined>} The category ID
 */
export async function getCategoryFromItemTextAsync(itemText, options = {}) {
  const itemClass = extractItemClass(itemText);
  return getCategoryForItemClassAsync(itemClass, options);
}

/**
 * Builds the type_filters object (async version with live fetch)
 * @param {string} itemText - Raw item text
 * @param {object} options - Options for fetching
 * @returns {Promise<object|undefined>} The filters object
 */
export async function buildTypeFiltersAsync(itemText, options = {}) {
  const category = await getCategoryFromItemTextAsync(itemText, options);

  if (!category) {
    return undefined;
  }

  return {
    type_filters: {
      filters: {
        category: {
          option: category
        }
      }
    }
  };
}

/**
 * Extracts the item class from copied item text
 * @param {string} itemText - Raw item text copied from game
 * @returns {string|undefined} The item class name, or undefined if not found
 *
 * @example
 * extractItemClass("Item Class: Quarterstaves\nRarity: Rare\n...")
 * // Returns: "Quarterstaves"
 */
export function extractItemClass(itemText) {
  if (!itemText || typeof itemText !== "string") {
    return undefined;
  }

  const match = itemText.match(/^Item Class: (.+)$/m);
  return match ? match[1].trim() : undefined;
}

/**
 * Gets the trade API category ID for an item class
 * @param {string} itemClass - The item class name (e.g., "Quarterstaves")
 * @returns {string|undefined} The category ID (e.g., "weapon.warstaff"), or undefined if not mapped
 *
 * @example
 * getCategoryForItemClass("Quarterstaves")
 * // Returns: "weapon.warstaff"
 */
export function getCategoryForItemClass(itemClass) {
  if (!itemClass) {
    return undefined;
  }
  return ITEM_CLASS_TO_CATEGORY[itemClass];
}

/**
 * Gets the trade API category ID directly from item text
 * @param {string} itemText - Raw item text copied from game
 * @returns {string|undefined} The category ID, or undefined if not found/mapped
 *
 * @example
 * getCategoryFromItemText("Item Class: Gloves\nRarity: Rare\n...")
 * // Returns: "armour.gloves"
 */
export function getCategoryFromItemText(itemText) {
  const itemClass = extractItemClass(itemText);
  return getCategoryForItemClass(itemClass);
}

/**
 * Builds the type_filters object for the trade API query
 * @param {string} itemText - Raw item text copied from game
 * @returns {object|undefined} The filters object, or undefined if category not found
 *
 * @example
 * buildTypeFilters("Item Class: Quarterstaves\n...")
 * // Returns: { type_filters: { filters: { category: { option: "weapon.warstaff" } } } }
 */
export function buildTypeFilters(itemText) {
  const category = getCategoryFromItemText(itemText);

  if (!category) {
    return undefined;
  }

  return {
    type_filters: {
      filters: {
        category: {
          option: category
        }
      }
    }
  };
}

/**
 * Returns all supported item classes
 * @returns {string[]} Array of supported item class names
 */
export function getSupportedItemClasses() {
  return Object.keys(ITEM_CLASS_TO_CATEGORY);
}

/**
 * Checks if an item class is supported
 * @param {string} itemClass - The item class name
 * @returns {boolean} True if the item class is supported
 */
export function isItemClassSupported(itemClass) {
  return itemClass in ITEM_CLASS_TO_CATEGORY;
}
