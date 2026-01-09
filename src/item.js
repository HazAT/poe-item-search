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

  // Group resistance stats
  const resistanceStats = matched.filter(stat => resistanceExplicitIds.includes(stat.id));

  // Group attribute stats
  const attributeStats = matched.filter(stat =>
    stat.id === "explicit.stat_4080418644" || // Strength
    stat.id === "explicit.stat_3261801346" || // Dexterity
    stat.id === "explicit.stat_328541901"     // Intelligence
  );

  // ⭐ MOVER PARA AQUI - ANTES de usar nos blocos de resistance/attribute
  // IDs de elemental/chaos damage to Attacks
  const elementalAttackDamageIds = {
    fire:      "explicit.stat_1573130764",
    cold:      "explicit.stat_4067062424",
    lightning: "explicit.stat_1754445556",
    chaos:     "explicit.stat_674553446",
  };
  const elementalAttackDamageAllIds = Object.values(elementalAttackDamageIds);

  // Stats de elemental/chaos damage encontrados no item
  const elementalAttackDamageStats = matched
    .map((stat) => {
      const resolvedId = resolveAttackDamageIdFromText(stat);
      if (!resolvedId) return null;
      return { ...stat, resolvedId };
    })
    .filter(
      (s) =>
        s &&
        elementalAttackDamageAllIds.includes(s.resolvedId)
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
      id: normalizeStatIdToExplicit(stat.id),
      ...(stat.value && { value: stat.value }),
      // Desmarcar se o stat está em elementalAttackDamageStats
      disabled: elementalAttackDamageStats.some(
        (s) => normalizeStatIdToExplicit(s.id) === normalizeStatIdToExplicit(stat.id)
      ),
    }));

    statsArray.push({
      type: "and",
      filters: nonResistanceFilters,
    });
  }

  // ⭐ AGORA PODE USAR elementalAttackDamageStats aqui
  // Add resistance stats as a weighted filter if any exist
  if (resistanceStats.length > 0) {
    const resistanceFilters = [];

    let totalWeight = 0;
    resistanceStats.forEach(stat => {
      const value = parseInt(stat.value.min);
      totalWeight += value;
      resistanceFilters.push({
        id: stat.id,
        value: { weight: 1, min: 1 },
        disabled: elementalAttackDamageStats.length > 0 ? true : false,
      });
    });

    Object.values(resistanceIds).forEach(id => {
      if (!resistanceStats.find(stat => stat.id === id)) {
        resistanceFilters.push({
          id,
          value: { weight: 1 },
          disabled: elementalAttackDamageStats.length > 0 ? true : false,
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

    let totalWeight = 0;
    attributeStats.forEach(stat => {
      const value = parseInt(stat.value.min);
      totalWeight += value;
      attributeFilters.push({
        id: stat.id,
        value: { weight: 1, min: 1 },
        disabled: elementalAttackDamageStats.length > 0 ? true : false,
      });
    });

    Object.entries(attributeIds).forEach(([type, id]) => {
      if (!attributeStats.find(stat => stat.id === id)) {
        attributeFilters.push({
          id,
          value: { weight: 1 },
          disabled: elementalAttackDamageStats.length > 0 ? true : false,
        });
      }
    });

    statsArray.push({
      type: "weight",
      filters: attributeFilters,
      value: { min: totalWeight },
    });
  }

  // Bloco Weighted Sum para elemental/chaos damage to Attacks
  if (elementalAttackDamageStats.length > 0) {
    const elementalAttackDamageFilters = [];
    let totalAttackDamageWeight = 0;

    elementalAttackDamageStats.forEach((stat) => {
      const value = Math.floor(Number(stat.value?.min ?? 0));
      totalAttackDamageWeight += value;

      elementalAttackDamageFilters.push({
        id: normalizeStatIdToExplicit(stat.id),
        value: { weight: 1 },
        disabled: false,
      });
    });

    elementalAttackDamageAllIds.forEach((id) => {
      if (!elementalAttackDamageStats.find((s) => normalizeStatIdToExplicit(s.id) === id)) {
        elementalAttackDamageFilters.push({
          id: normalizeStatIdToExplicit(id),
          value: { weight: 1 },
          disabled: false,
        });
      }
    });

    statsArray.push({
      type: "weight",
      filters: elementalAttackDamageFilters,
      value: { min: totalAttackDamageWeight },
    });
  }

  query.stats = statsArray;
  console.log("[PoE Search] query.stats =", JSON.stringify(statsArray, null, 2));
  console.log("[PoE Search] query =", JSON.stringify(query, null, 2));
  return query;
}

export function matchUniqueItem(item) {
  const uniqueRegex = /Rarity: Unique\n([^\n]+)/;
  const match = item.match(uniqueRegex);

  return match ? match[1] : undefined;
}

function stripTag(text, type) {
  if (type === "implicit") return text; // mantém implicit

  return text
    .replace(" (fractured)", "")
    .replace(" (desecrated)", "");
}

function normalizeStatIdToExplicit(id) {
  if (id.startsWith("fractured.")) {
    return id.replace("fractured.", "explicit.");
  }
  if (id.startsWith("desecrated.")) {
    return id.replace("desecrated.", "explicit.");
  }
  return id;
}

function resolveAttackDamageIdFromText(stat) {
  const text = stat.text.toLowerCase();

  if (text.includes("damage to attacks")) {
    if (text.includes("fire damage")) {
      return "explicit.stat_1573130764";
    }
    if (text.includes("cold damage")) {
      return "explicit.stat_4067062424";
    }
    if (text.includes("lightning damage")) {
      return "explicit.stat_1754445556";
    }
    if (text.includes("chaos damage")) {
      return "explicit.stat_674553446";
    }
  }

  return null;
}

export function matchStatsOnItem(item, stats) {
  const matched = [];
  for (const category of stats.result) {
    for (const entry of category.entries) {
      if (
        !entry ||
        !["explicit", "implicit", "fractured", "desecrated"].includes(entry.type)
      ) {
        continue;
      }

      let m;
      while ((m = entry.regex.exec(item)) !== null) {
        if (m.index === entry.regex.lastIndex) {
          entry.regex.lastIndex++;
        }

        const capturedValues = [];
        for (let i = 1; i < m.length; i++) {
          if (m[i] !== undefined) {
            capturedValues.push(parseFloat(m[i]));
          }
        }
        if (capturedValues.length === 0) continue;

        let minValue;
        if (capturedValues.length === 2) {
          minValue = (capturedValues[0] + capturedValues[1]) / 2;
        } else {
          minValue = m[1];
        }

        const cleanText = stripTag(entry.text, entry.type);

        const matchedEntry = {
          ...entry,
          text: cleanText,
          value: { min: minValue },
        };

        matched.push(matchedEntry);
      }
    }
  }

  const uniqueMatched = matched.filter(
    (entry, index, self) =>
      index ===
      self.findIndex((e) => e.text === entry.text && e.type === entry.type)
  );
  return uniqueMatched;
}
