import { extractItemClass } from "./itemClass.js";

/** Build trade filters for item properties that are not modifier stats. */
export function buildPropertyFilters(item, { poe2 = true } = {}) {
  /** @type {Record<string, { filters: Record<string, { option?: string, min?: number }> }>} */
  const filters = {};
  const rarity = item.match(/^Rarity:[ \t]*(Normal|Magic)[ \t]*$/m)?.[1];
  if (rarity) {
    filters.type_filters = { filters: { rarity: { option: rarity.toLowerCase() } } };
    const itemLevel = item.match(/^(?:##[ \t]+)?Item Level:[ \t]*(\d+)[ \t]*$/m)?.[1];
    if (itemLevel) {
      // Item level moved from Miscellaneous to Type Filters in the PoE2 API.
      const group = poe2 ? "type_filters" : "misc_filters";
      filters[group] ??= { filters: {} };
      filters[group].filters.ilvl = { min: Number(itemLevel) };
    }
  }

  if (extractItemClass(item) !== "Inscribed Ultimatum") return filters;

  const areaLevel = item.match(/^(?:##[ \t]+)?Area Level:[ \t]*(\d+)[ \t]*$/m)?.[1];
  if (areaLevel) {
    filters.misc_filters ??= { filters: {} };
    filters.misc_filters.filters.area_level = { min: Number(areaLevel) };
  }

  // The API calls these Ultimatum hints, and expects the copied capitalization.
  const hint = item.match(/^(Victorious|Cowardly|Deadly)[ \t]*$/m)?.[1];
  if (hint) {
    filters.map_filters = { filters: { ultimatum_hint: { option: hint } } };
  }

  // Number of Trials has no separate filter in the trade API.
  return filters;
}
