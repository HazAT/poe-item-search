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

  // Group resistance stats
  const resistanceStats = matched.filter(stat => 
    stat.id === "explicit.stat_4220027924" || // Cold
    stat.id === "explicit.stat_1671376347" || // Lightning
    stat.id === "explicit.stat_3372524247" || // Fire
    stat.id === "explicit.stat_2923486259"    // Chaos
  );

  // Get non-resistance stats
  const nonResistanceStats = matched.filter(stat => 
    stat.id !== "explicit.stat_4220027924" && // Cold
    stat.id !== "explicit.stat_1671376347" && // Lightning
    stat.id !== "explicit.stat_3372524247" && // Fire
    stat.id !== "explicit.stat_2923486259"    // Chaos
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

  // Add resistance stats as a weighted filter if any exist
  if (resistanceStats.length > 0) {
    const resistanceFilters = [];
    const resistanceIds = {
      cold: "explicit.stat_4220027924",
      lightning: "explicit.stat_1671376347",
      fire: "explicit.stat_3372524247",
      chaos: "explicit.stat_2923486259"
    };

    // Add found resistances with their values
    let totalWeight = 0;
    resistanceStats.forEach(stat => {
      const value = parseInt(stat.value.min);
      totalWeight += value;
      resistanceFilters.push({
        id: stat.id,
        value: { weight: 1, min: value },
        disabled: false
      });
    });

    // Add missing resistances as disabled
    Object.entries(resistanceIds).forEach(([type, id]) => {
      if (!resistanceStats.find(stat => stat.id === id)) {
        resistanceFilters.push({
          id,
          value: { weight: 1 },
          disabled: true
        });
      }
    });

    statsArray.push({
      type: "weight",
      filters: resistanceFilters,
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
