import { addRegexToStats } from "./stat.js";

export function getSearchQuery(item, stats) {
  const query = {};

  const regexStats = addRegexToStats(stats);
  const unique = matchUniqueItem(item);

  if (unique) {
    query.term = unique;
  }
  // TODO: match item class
  const matched = matchStatsOnItem(item, regexStats);

  // Resistance stat IDs (explicit) and their pseudo equivalents
  const resistanceMapping = {
    "explicit.stat_3372524247": "pseudo.pseudo_total_fire_resistance",      // Fire
    "explicit.stat_4220027924": "pseudo.pseudo_total_cold_resistance",      // Cold
    "explicit.stat_1671376347": "pseudo.pseudo_total_lightning_resistance", // Lightning
    "explicit.stat_2923486259": "pseudo.pseudo_total_chaos_resistance"      // Chaos
  };
  const resistanceExplicitIds = Object.keys(resistanceMapping);

  // Group resistance stats
  const resistanceStats = matched.filter(stat => resistanceExplicitIds.includes(stat.id));

  // Group attribute stats
  const attributeStats = matched.filter(stat =>
    stat.id === "explicit.stat_4080418644" || // Strength
    stat.id === "explicit.stat_3261801346" || // Dexterity
    stat.id === "explicit.stat_328541901"     // Intelligence
  );

  // Get non-resistance and non-attribute stats
  const nonResistanceStats = matched.filter(stat =>
    !resistanceExplicitIds.includes(stat.id) &&
    stat.id !== "explicit.stat_4080418644" && // Strength
    stat.id !== "explicit.stat_3261801346" && // Dexterity
    stat.id !== "explicit.stat_328541901"     // Intelligence
  );

  const statsArray = [];

  // Add non-resistance stats as an "and" filter
  if (nonResistanceStats.length > 0) {
    const nonResistanceFilters = nonResistanceStats.map((stat) => ({
      id: stat.id,
      ...(stat.value && { value: stat.value }),
    }));

    statsArray.push({
      type: "and",
      filters: nonResistanceFilters,
    });
  }

  // Add resistance stats using pseudo stats with weighted filter
  if (resistanceStats.length > 0) {
    const resistanceFilters = resistanceStats.map(stat => ({
      id: resistanceMapping[stat.id],
      value: { min: parseInt(stat.value.min) }
    }));

    statsArray.push({
      type: "weight",
      filters: resistanceFilters,
    });
  }

  // Add attribute stats as a weighted filter if any exist
  if (attributeStats.length > 0) {
    const attributeFilters = [];
    const attributeIds = {
      strength: "explicit.stat_4080418644",
      dexterity: "explicit.stat_3261801346",
      intelligence: "explicit.stat_328541901"
    };

    // Add found attributes with their values
    let totalWeight = 0;
    attributeStats.forEach(stat => {
      const value = parseInt(stat.value.min);
      totalWeight += value;
      attributeFilters.push({
        id: stat.id,
        value: { weight: 1, min: value },
        disabled: false
      });
    });

    // Add missing attributes as disabled
    Object.entries(attributeIds).forEach(([type, id]) => {
      if (!attributeStats.find(stat => stat.id === id)) {
        attributeFilters.push({
          id,
          value: { weight: 1 },
          disabled: true
        });
      }
    });

    statsArray.push({
      type: "weight",
      filters: attributeFilters,
      value: { min: totalWeight },
    });
  }

  query.stats = statsArray;
  return query;
}

export function matchUniqueItem(item) {
  const uniqueRegex = /Rarity: Unique\n([^\n]+)/;
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
        m.forEach((match, groupIndex) => {
          if (groupIndex === 0) {
            return;
          }
          // Create a shallow copy of entry for each match
          const matchedEntry = { ...entry, value: { min: match } };
          // Check if the stat text contains '(implicit)' and set type accordingly
          if (entry.text.includes("(implicit)")) {
            matchedEntry.type = "implicit";
          }
          matched.push(matchedEntry);
        });
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
