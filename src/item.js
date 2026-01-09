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
const resistanceStats = matched.filter(stat => 
  resistanceExplicitIds.includes(stat.id) ||
  normalizeStatIdToExplicit(stat.id) === "explicit.stat_2901986750"
);

  // Group attribute stats
  const attributeStats = matched.filter(stat =>
    stat.id === "explicit.stat_4080418644" || // Strength
    stat.id === "explicit.stat_3261801346" || // Dexterity
    stat.id === "explicit.stat_328541901"     // Intelligence
  );

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

    // IDs de physical damage to Attacks
    const physicalAttackDamageIds = {
      explicit: "explicit.stat_3032590688",
      implicit: "implicit.stat_3032590688",
    };
    const physicalAttackDamageAllIds = Object.values(physicalAttackDamageIds);

    // Stats de physical damage encontrados no item
    const physicalAttackDamageStats = matched
      .map((stat) => {
        const resolvedId = resolvePhysicalAttackDamageId(stat);
        if (!resolvedId) return null;
        return { ...stat, resolvedId };
      })
      .filter(
        (s) =>
          s &&
          physicalAttackDamageAllIds.includes(s.resolvedId)
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
      ) || physicalAttackDamageStats.some(
        (s) => normalizeStatIdToExplicit(s.id) === normalizeStatIdToExplicit(stat.id)
      ),
    }));

   // Se resistances estão disabled, adicionar o pseudo-stat de total resistance ao bloco AND
    if (resistanceStats.length > 0 && elementalAttackDamageStats.length > 0) {
      let totalResistance = 0;
      resistanceStats.forEach(stat => {
        const value = parseInt(stat.value.min);
        
        // Se é "to all Elemental Resistances" (ID: explicit.stat_2901986750), multiplicar por 3
        const multiplier = normalizeStatIdToExplicit(stat.id) === "explicit.stat_2901986750" ? 3 : 1;
        const adjustedValue = value * multiplier;
        
        totalResistance += adjustedValue;
      });

      nonResistanceFilters.push({
        id: "pseudo.pseudo_total_resistance",
        value: { min: totalResistance },
      });
    }

    // Se attributes estão disabled, adicionar o pseudo-stat de total attributes ao bloco AND
    if (attributeStats.length > 0 && elementalAttackDamageStats.length > 0) {
      let totalAttributes = 0;
      attributeStats.forEach(stat => {
        totalAttributes += parseInt(stat.value.min);
      });

      nonResistanceFilters.push({
        id: "pseudo.pseudo_total_attributes",
        value: { min: totalAttributes },
      });
    }

    statsArray.push({
      type: "and",
      filters: nonResistanceFilters,
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

  // Bloco Weighted Sum para physical damage to Attacks
  if (physicalAttackDamageStats.length > 0) {
    const physicalAttackDamageFilters = [];
    let totalPhysicalAttackDamageWeight = 0;

    physicalAttackDamageStats.forEach((stat) => {
      const value = Math.floor(Number(stat.value?.min ?? 0));
      totalPhysicalAttackDamageWeight += value;

      physicalAttackDamageFilters.push({
        id: normalizeStatIdToExplicit(stat.id),
        value: { weight: 1 },
        disabled: false,
      });
    });

    physicalAttackDamageAllIds.forEach((id) => {
      if (!physicalAttackDamageStats.find((s) => normalizeStatIdToExplicit(s.id) === id)) {
        physicalAttackDamageFilters.push({
          id: normalizeStatIdToExplicit(id),
          value: { weight: 1 },
          disabled: false,
        });
      }
    });

    statsArray.push({
      type: "weight",
      filters: physicalAttackDamageFilters,
      value: { min: totalPhysicalAttackDamageWeight },
    }); 
  }

  // Add resistance stats as a weighted filter if any exist
  if (resistanceStats.length > 0) {
    const resistanceFilters = [];

    // Add found resistances with their values
    let totalWeight = 0;
    resistanceStats.forEach(stat => {
      const value = parseInt(stat.value.min);
      
      // Se é "to all Elemental Resistances" (ID: explicit.stat_2901986750), multiplicar por 3
      const multiplier = normalizeStatIdToExplicit(stat.id) === "explicit.stat_2901986750" ? 3 : 1;
      const adjustedValue = value * multiplier;
      
      totalWeight += adjustedValue;
      resistanceFilters.push({
        id: stat.id,
        value: { weight: 1, min: 1 },
        disabled: (elementalAttackDamageStats.length > 0 || physicalAttackDamageStats.length > 0) ? true : false,
      });
    });

    Object.values(resistanceIds).forEach(id => {
      if (!resistanceStats.find(stat => stat.id === id)) {
        resistanceFilters.push({
          id,
          value: { weight: 1 },
          disabled: (elementalAttackDamageStats.length > 0 || physicalAttackDamageStats.length > 0) ? true : false,
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
      intelligence: "explicit.stat_328541901",
    };

    let totalWeight = 0;
    attributeStats.forEach((stat) => {
      const value = parseInt(stat.value.min);
      totalWeight += value;
      attributeFilters.push({
        id: stat.id,
        value: { weight: 1, min: 1 },
        // continua desabilitando quando tiver QUALQUER ataque
        disabled:
          elementalAttackDamageStats.length > 0 ||
          physicalAttackDamageStats.length > 0
            ? true
            : false,
      });
    });

    Object.entries(attributeIds).forEach(([type, id]) => {
      if (!attributeStats.find((stat) => stat.id === id)) {
        attributeFilters.push({
          id,
          value: { weight: 1 },
          disabled:
            elementalAttackDamageStats.length > 0 ||
            physicalAttackDamageStats.length > 0
              ? true
              : false,
        });
      }
    });

    // 👉 aqui está a regra: só “mata” o grupo quando tiver elemental + físico
    const hasBothAttackBlocks =
      elementalAttackDamageStats.length > 0 &&
      physicalAttackDamageStats.length > 0;

    if  (!hasBothAttackBlocks){
      statsArray.push({
        type: "weight",
        filters: hasBothAttackBlocks
          ? attributeFilters.map((f) => ({ ...f, disabled: true }))
          : attributeFilters,
        value: { min: totalWeight },
      });
    }
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

function resolvePhysicalAttackDamageId(stat) {
  const text = stat.text.toLowerCase();

  if (text.includes("physical damage to attacks")) {
    if (stat.type === "implicit") {
      return "implicit.stat_3032590688";
    }
    return "explicit.stat_3032590688";
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
          minValue = capturedValues[0]; // já é parseFloat, sempre número
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
