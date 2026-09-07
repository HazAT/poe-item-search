import { addRegexToStats } from "./stat.js";
import { buildTypeFilters } from "./itemClass.js";

// Group order and the order of disabled alternatives are reflected in the trade form.
const WEIGHTED_STAT_GROUPS = [
  // Resistances: fire, cold, lightning, chaos.
  ["explicit.stat_3372524247", "explicit.stat_4220027924", "explicit.stat_1671376347", "explicit.stat_2923486259"],
  // Attributes: strength, dexterity, intelligence.
  ["explicit.stat_4080418644", "explicit.stat_3261801346", "explicit.stat_328541901"],
  // Spell, fire, cold, lightning, chaos and spell physical damage.
  ["explicit.stat_2974417149", "explicit.stat_3962278098", "explicit.stat_3291658075", "explicit.stat_2231156303", "explicit.stat_736967255", "explicit.stat_2768835289"],
  // Gain damage as extra fire, cold, lightning, chaos and physical damage.
  ["explicit.stat_3015669065", "explicit.stat_2505884597", "explicit.stat_3278136794", "explicit.stat_3398787959", "explicit.stat_4019237939"],
  // Attacks gain extra fire, cold and physical-as-chaos damage.
  ["explicit.stat_1049080093", "explicit.stat_1484500028", "explicit.stat_261503687"],
];
const WEIGHTED_STAT_IDS = new Set(WEIGHTED_STAT_GROUPS.flat());

function buildWeightedGroup(matched, ids) {
  const found = matched.filter(stat => ids.includes(stat.id));
  if (found.length === 0) return null;

  const foundIds = new Set(found.map(stat => stat.id));
  const filters = found.map(stat => ({
    id: stat.id,
    value: { weight: 1, min: Number(stat.value.min) },
    disabled: false,
  }));
  const minimum = filters.reduce((sum, filter) => sum + filter.value.min, 0);

  // Keep enabled filters in API match order, followed by disabled alternatives.
  for (const id of ids) {
    if (!foundIds.has(id)) {
      filters.push({ id, value: { weight: 1 }, disabled: true });
    }
  }
  return { type: "weight", filters, value: { min: minimum } };
}

export function getSearchQuery(item, stats) {
  const query = {};
  const unique = matchUniqueItem(item);

  if (unique) {
    query.term = unique;
  } else {
    const typeFilters = buildTypeFilters(item);
    if (typeFilters) query.filters = typeFilters;
  }

  const matched = matchStatsOnItem(item, addRegexToStats(stats));
  const nonGrouped = matched.filter(stat => !WEIGHTED_STAT_IDS.has(stat.id));
  query.stats = [];

  if (nonGrouped.length > 0) {
    query.stats.push({
      type: "and",
      filters: nonGrouped.map(({ id, value }) => ({ id, ...(value && { value }) })),
    });
  }

  for (const ids of WEIGHTED_STAT_GROUPS) {
    const group = buildWeightedGroup(matched, ids);
    if (group) query.stats.push(group);
  }

  return query;
}

export function matchUniqueItem(item) {
  const uniqueRegex = /Rarity: Unique\r?\n([^\r\n]+)/;
  const match = item.match(uniqueRegex);

  return match ? match[1] : undefined;
}

export function matchStatsOnItem(item, stats) {
  const matched = [];
  for (const category of stats.result) {
    for (const entry of category.entries) {
      if (!entry || (entry.type !== "explicit" && entry.type !== "implicit")) {
        continue;
      }
      let m;
      while ((m = entry.regex.exec(item)) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
        if (m.index === entry.regex.lastIndex) {
          entry.regex.lastIndex++;
        }
        // Collect all captured numeric values (groups 1, 2, etc.)
        const capturedValues = [];
        for (let i = 1; i < m.length; i++) {
          if (m[i] !== undefined) {
            capturedValues.push(parseFloat(m[i]));
          }
        }

        if (capturedValues.length === 0) {
          continue;
        }

        // Calculate the value to use:
        // - For range stats (2 values like "Adds X to Y damage"), use the average
        // - For single value stats, use that value
        let minValue;
        if (capturedValues.length === 2) {
          // Average the two values for damage range stats
          minValue = (capturedValues[0] + capturedValues[1]) / 2;
        } else {
          // Preserve the existing single-value trade query format.
          minValue = m[1].replace(/^\+/, "");
        }

        // Create a shallow copy of entry for the match
        const matchedEntry = { ...entry, value: { min: minValue } };
        // Check if the stat text contains '(implicit)' and set type accordingly
        if (entry.text.includes("(implicit)")) {
          matchedEntry.type = "implicit";
        }
        matched.push(matchedEntry);
      }
    }
  }
  // Deduplicate entries based on text and type attribute
  const uniqueMatched = matched.filter(
    (entry, index, self) =>
      index === self.findIndex((e) => e.text === entry.text && e.type === entry.type)
  );
  return uniqueMatched;
}
