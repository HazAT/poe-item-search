import { addRegexToStats } from "./stat.js";
import { buildTypeFilters } from "./itemClass.js";

export function getSearchQuery(item, stats) {
  const query = {};

  const regexStats = addRegexToStats(stats);
  const unique = matchUniqueItem(item);

  if (unique) {
    query.term = unique;
  }

  // Add type filters for non-unique items
  if (!unique) {
    const typeFilters = buildTypeFilters(item);
    if (typeFilters) {
      query.filters = typeFilters;
    }
  }

  const matched = matchStatsOnItem(item, regexStats);

  // Resistance stat IDs (explicit)
  const resistanceIds = {
    fire: "explicit.stat_3372524247",
    cold: "explicit.stat_4220027924",
    lightning: "explicit.stat_1671376347",
    chaos: "explicit.stat_2923486259"
  };
  const resistanceExplicitIds = Object.values(resistanceIds);

  // Increased Spell Damage stat IDs (explicit)
  const spellDamageIds = {
    spell: "explicit.stat_2974417149",
    fire: "explicit.stat_3962278098",
    cold: "explicit.stat_3291658075",
    lightning: "explicit.stat_2231156303",
    chaos: "explicit.stat_736967255",
    spellPhysical: "explicit.stat_2768835289"
  };
  const spellDamageExplicitIds = Object.values(spellDamageIds);

  // Gain as Extra Damage stat IDs (explicit)
  const gainExtraDamageIds = {
    fire: "explicit.stat_3015669065",
    cold: "explicit.stat_2505884597",
    lightning: "explicit.stat_3278136794",
    chaos: "explicit.stat_3398787959",
    physical: "explicit.stat_4019237939"
  };
  const gainExtraDamageExplicitIds = Object.values(gainExtraDamageIds);

  // Attacks Gain as Extra Damage stat IDs (explicit)
  const attacksGainExtraDamageIds = {
    fire: "explicit.stat_1049080093",
    cold: "explicit.stat_1484500028",
    physicalAsChaos: "explicit.stat_261503687"
  };
  const attacksGainExtraDamageExplicitIds = Object.values(attacksGainExtraDamageIds);

  // Group resistance stats
  const resistanceStats = matched.filter(stat => resistanceExplicitIds.includes(stat.id));

  // Group attribute stats
  const attributeStats = matched.filter(stat =>
    stat.id === "explicit.stat_4080418644" || // Strength
    stat.id === "explicit.stat_3261801346" || // Dexterity
    stat.id === "explicit.stat_328541901"     // Intelligence
  );

  // Group spell damage stats
  const spellDamageStats = matched.filter(stat => spellDamageExplicitIds.includes(stat.id));

  // Group gain as extra damage stats
  const gainExtraDamageStats = matched.filter(stat => gainExtraDamageExplicitIds.includes(stat.id));

  // Group attacks gain as extra damage stats
  const attacksGainExtraDamageStats = matched.filter(stat => attacksGainExtraDamageExplicitIds.includes(stat.id));

  // Get stats that aren't in any weighted group
  const nonGroupedStats = matched.filter(stat =>
    !resistanceExplicitIds.includes(stat.id) &&
    stat.id !== "explicit.stat_4080418644" && // Strength
    stat.id !== "explicit.stat_3261801346" && // Dexterity
    stat.id !== "explicit.stat_328541901" &&  // Intelligence
    !spellDamageExplicitIds.includes(stat.id) &&
    !gainExtraDamageExplicitIds.includes(stat.id) &&
    !attacksGainExtraDamageExplicitIds.includes(stat.id)
  );

  const statsArray = [];

  // Add non-grouped stats as an "and" filter
  if (nonGroupedStats.length > 0) {
    const nonGroupedFilters = nonGroupedStats.map((stat) => ({
      id: stat.id,
      ...(stat.value && { value: stat.value }),
    }));

    statsArray.push({
      type: "and",
      filters: nonGroupedFilters,
    });
  }

  // Add resistance stats as a weighted filter if any exist
  if (resistanceStats.length > 0) {
    const resistanceFilters = [];

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
    Object.values(resistanceIds).forEach(id => {
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

  // Add spell damage stats as a weighted filter if any exist
  if (spellDamageStats.length > 0) {
    const spellDamageFilters = [];

    // Add found spell damage stats with their values
    let totalWeight = 0;
    spellDamageStats.forEach(stat => {
      const value = parseInt(stat.value.min);
      totalWeight += value;
      spellDamageFilters.push({
        id: stat.id,
        value: { weight: 1, min: value },
        disabled: false
      });
    });

    // Add missing spell damage stats as disabled
    Object.values(spellDamageIds).forEach(id => {
      if (!spellDamageStats.find(stat => stat.id === id)) {
        spellDamageFilters.push({
          id,
          value: { weight: 1 },
          disabled: true
        });
      }
    });

    statsArray.push({
      type: "weight",
      filters: spellDamageFilters,
      value: { min: totalWeight },
    });
  }

  // Add gain as extra damage stats as a weighted filter if any exist
  if (gainExtraDamageStats.length > 0) {
    const gainExtraDamageFilters = [];

    // Add found gain as extra damage stats with their values
    let totalWeight = 0;
    gainExtraDamageStats.forEach(stat => {
      const value = parseInt(stat.value.min);
      totalWeight += value;
      gainExtraDamageFilters.push({
        id: stat.id,
        value: { weight: 1, min: value },
        disabled: false
      });
    });

    // Add missing gain as extra damage stats as disabled
    Object.values(gainExtraDamageIds).forEach(id => {
      if (!gainExtraDamageStats.find(stat => stat.id === id)) {
        gainExtraDamageFilters.push({
          id,
          value: { weight: 1 },
          disabled: true
        });
      }
    });

    statsArray.push({
      type: "weight",
      filters: gainExtraDamageFilters,
      value: { min: totalWeight },
    });
  }

  // Add attacks gain as extra damage stats as a weighted filter if any exist
  if (attacksGainExtraDamageStats.length > 0) {
    const attacksGainExtraDamageFilters = [];

    // Add found attacks gain as extra damage stats with their values
    let totalWeight = 0;
    attacksGainExtraDamageStats.forEach(stat => {
      const value = parseInt(stat.value.min);
      totalWeight += value;
      attacksGainExtraDamageFilters.push({
        id: stat.id,
        value: { weight: 1, min: value },
        disabled: false
      });
    });

    // Add missing attacks gain as extra damage stats as disabled
    Object.values(attacksGainExtraDamageIds).forEach(id => {
      if (!attacksGainExtraDamageStats.find(stat => stat.id === id)) {
        attacksGainExtraDamageFilters.push({
          id,
          value: { weight: 1 },
          disabled: true
        });
      }
    });

    statsArray.push({
      type: "weight",
      filters: attacksGainExtraDamageFilters,
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
          // Single value - keep as string for backwards compatibility with existing tests
          minValue = m[1];
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
