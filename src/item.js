import { addRegexToStats } from "./stat.js";
import { buildTypeFilters } from "./itemClass.js";

export function getSearchQuery(item, stats) {
  const query = {};

  const regexStats = addRegexToStats(stats);
  const unique = matchUniqueItem(item);

  if (unique) {
    query.term = unique;
  }

  if (!unique) {
    const typeFilters = buildTypeFilters(item);
    if (typeFilters) {
      query.filters = typeFilters;
    }
  }

  // ✅ NOVO: Adicionar equipment filters
  const equipmentStats = extractEquipmentStats(item);
  if (equipmentStats) {
    if (!query.filters) query.filters = {};
    query.filters.equipment_filters = {
      filters: equipmentStats,
      disabled: false
    };
  }

  const matched = matchStatsOnItem(item, regexStats);

  // ✨ NOVO: Detectar runas
  const runeStats = matched.filter(stat =>
    stat.text.includes("(rune)")
  );

  const nonRuneStats = matched.filter(stat =>
    !stat.text.includes("(rune)")
  );

  // Resistance stat IDs (explicit) - ✅ DEFINIR PRIMEIRO
  const resistanceIds = {
    fire: "explicit.stat_3372524247",
    cold: "explicit.stat_4220027924",
    lightning: "explicit.stat_1671376347",
    chaos: "explicit.stat_2923486259",
    fireChaos: "explicit.stat_378817135",      // Fire and Chaos
    lightningChaos: "explicit.stat_3465022881", // Lightning and Chaos
    coldChaos: "explicit.stat_3393628375"       // Cold and Chaos
  };
  const resistanceExplicitIds = Object.values(resistanceIds);

  // IDs de elemental/chaos damage to Attacks
  const elementalAttackDamageIds = {
    fire: "explicit.stat_1573130764",
    cold: "explicit.stat_4067062424",
    lightning: "explicit.stat_1754445556",
    chaos: "explicit.stat_674553446",
  };
  const elementalAttackDamageAllIds = Object.values(elementalAttackDamageIds);

  // IDs de physical damage to Attacks
  const physicalAttackDamageIds = {
    explicit: "explicit.stat_3032590688",
    implicit: "implicit.stat_3032590688",
  };
  const physicalAttackDamageAllIds = Object.values(physicalAttackDamageIds);

  // Agora sim, usar nonRuneStats
  const resistanceStats = nonRuneStats.filter(stat =>
    resistanceExplicitIds.includes(normalizeStatIdToExplicit(stat.id)) ||
    normalizeStatIdToExplicit(stat.id) === "explicit.stat_2901986750" // to all Elemental Resistances
  );

  const attributeStats = nonRuneStats.filter(stat => {
    const normalizedId = normalizeStatIdToExplicit(stat.id);
    return normalizedId === "explicit.stat_4080418644" || // Strength
      normalizedId === "explicit.stat_3261801346" || // Dexterity
      normalizedId === "explicit.stat_328541901" || // Intelligence
      normalizedId === "explicit.stat_1535626285" || // Strength and Intelligence
      normalizedId === "explicit.stat_538848803" || // Strength and Dexterity
      normalizedId === "explicit.stat_2300185227"; // Dexterity and Intelligence
  });

  const elementalAttackDamageStats = nonRuneStats
    .map((stat) => {
      const resolvedId = resolveAttackDamageIdFromText(stat);
      if (!resolvedId) return null;
      return { ...stat, resolvedId };
    })
    .filter((s) => s && elementalAttackDamageAllIds.includes(s.resolvedId));

  const physicalAttackDamageStats = nonRuneStats
    .map((stat) => {
      const resolvedId = resolvePhysicalAttackDamageId(stat);
      if (!resolvedId) return null;
      return { ...stat, resolvedId };
    })
    .filter((s) => s && physicalAttackDamageAllIds.includes(s.resolvedId));

  const nonResistanceStats = nonRuneStats.filter(stat =>
    !resistanceExplicitIds.includes(normalizeStatIdToExplicit(stat.id)) &&
    normalizeStatIdToExplicit(stat.id) !== "explicit.stat_4080418644" &&
    normalizeStatIdToExplicit(stat.id) !== "explicit.stat_3261801346" &&
    normalizeStatIdToExplicit(stat.id) !== "explicit.stat_328541901"
  );

  // ✨ NOVO: Detectar Life stats
  const lifeStats = nonRuneStats.filter(stat =>
    normalizeStatIdToExplicit(stat.id) === "explicit.stat_3299347043" // # to maximum Life
  );

  // Remover Life stats de nonResistanceStats para não duplicar
  const nonResistanceStatsWithoutLife = nonResistanceStats.filter(stat =>
    normalizeStatIdToExplicit(stat.id) !== "explicit.stat_3299347043"
  );

  const statsArray = [];

  // Add non-resistance stats as an "and" filter
  if (nonResistanceStatsWithoutLife.length > 0 || runeStats.length > 0 || lifeStats.length > 0) {
    const nonResistanceFilters = nonResistanceStatsWithoutLife.map((stat) => ({
      id: normalizeStatIdToExplicit(stat.id),
      ...(stat.value && { value: stat.value }),
      disabled: elementalAttackDamageStats.some(
        (s) => normalizeStatIdToExplicit(s.id) === normalizeStatIdToExplicit(stat.id)
      ) || physicalAttackDamageStats.some(
        (s) => normalizeStatIdToExplicit(s.id) === normalizeStatIdToExplicit(stat.id)
      ),
    }));

    // ✨ NOVO: Adicionar pseudo Life ao invés dos stats individuais
    if (lifeStats.length > 0) {
      let totalLife = 0;
      lifeStats.forEach(stat => {
        totalLife += parseInt(stat.value.min);
      });

      nonResistanceFilters.push({
        id: "pseudo.pseudo_total_life",
        value: { min: totalLife },
      });
    }

    // ✨ NOVO: Adicionar runas ao bloco AND
    runeStats.forEach((stat) => {
      nonResistanceFilters.push({
        id: normalizeStatIdToRune(stat.id),
        ...(stat.value && { value: stat.value }),
        disabled: false,
      });
    });

    // Se resistances estão disabled, adicionar pseudo-stat
    if (resistanceStats.length > 0 && elementalAttackDamageStats.length > 0) {
      let totalResistance = 0;
      resistanceStats.forEach(stat => {
        const value = parseInt(stat.value.min);
        const multiplier = normalizeStatIdToExplicit(stat.id) === "explicit.stat_2901986750" ? 3 : 1;
        const adjustedValue = value * multiplier;
        totalResistance += adjustedValue;
      });

      nonResistanceFilters.push({
        id: "pseudo.pseudo_total_resistance",
        value: { min: totalResistance },
      });
    }

    // Se attributes estão disabled, adicionar pseudo-stat
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

      // ✨ NOVO: Detectar múltiplas resistências no mesmo mod
      const resistancesInText = getResistancesFromText(stat.text);
      const resistanceCount = resistancesInText.length > 0 ? resistancesInText.length : 1;

      // Se é "to all Elemental Resistances", multiplicar por 3
      const multiplier = normalizeStatIdToExplicit(stat.id) === "explicit.stat_2901986750" ? 3 : resistanceCount;
      const adjustedValue = value * multiplier;

      totalWeight += adjustedValue;
      resistanceFilters.push({
        id: normalizeStatIdToExplicit(stat.id),
        value: { weight: 1, min: 1 },
        disabled: (elementalAttackDamageStats.length > 0 || physicalAttackDamageStats.length > 0) ? true : false,
      });
    });

  Object.values(resistanceIds).forEach(id => {
    if (!resistanceStats.find(stat => normalizeStatIdToExplicit(stat.id) === id)) {
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

      // ✅ NOVO: Detectar múltiplos atributos no mesmo mod
      const attributesInText = getAttributesFromText(stat.text);
      const attributeCount = attributesInText.length > 0 ? attributesInText.length : 1;

      const adjustedValue = value * attributeCount;
      totalWeight += adjustedValue;

      attributeFilters.push({
        id: normalizeStatIdToExplicit(stat.id),
        value: { weight: 1, min: 1 },
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
    .replace(" (desecrated)", "")
    .replace(" (rune)", "");
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

function normalizeStatIdToRune(id) {
  const baseId = id.split(".").pop();
  return `rune.${baseId}`;
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

function getResistancesFromText(text) {
  const resistances = [];
  const lowerText = text.toLowerCase();

  if (lowerText.includes("fire")) resistances.push("fire");
  if (lowerText.includes("cold")) resistances.push("cold");
  if (lowerText.includes("lightning")) resistances.push("lightning");
  if (lowerText.includes("chaos")) resistances.push("chaos");

  return resistances;
}

function extractEquipmentStats(item) {
  const equipment = {};

  // Armour
  const armourMatch = item.match(/^Armour: (\d+)/m);
  if (armourMatch) {
    equipment.ar = { min: parseInt(armourMatch[1], 10) };
  }

  // Evasion
  const evasionMatch = item.match(/^Evasion Rating: (\d+)/m);
  if (evasionMatch) {
    equipment.ev = { min: parseInt(evasionMatch[1], 10) };
  }

  // Energy Shield
  const energyShieldMatch = item.match(/^Energy Shield: (\d+)/m);
  if (energyShieldMatch) {
    equipment.es = { min: parseInt(energyShieldMatch[1], 10) };
  }

  // Elemental Damage (para EDPS)
  const elementalLineMatch = item.match(/^Elemental Damage: (.+)$/m);
  const apsMatch = item.match(/^Attacks per Second: ([0-9]+(?:\.[0-9]+)?)/m);
  if (elementalLineMatch) {
    const elementalLine = elementalLineMatch[1];

    // quebra em grupos "87-141" / "9-376"
    const parts = elementalLine.split(",").map(p => p.trim());

    const nums = [];
    for (const p of parts) {
      const rangeMatch = p.match(/(\d+)\s*-\s*(\d+)/);
      if (!rangeMatch) continue;
      const min = parseInt(rangeMatch[1], 10);
      const max = parseInt(rangeMatch[2], 10);
      nums.push(min, max);
    }

    if (nums.length > 0) {
      const sumEPS = nums.reduce((acc, v) => acc + v, 0) / 2;

      // Se tem APS, aplica a fórmula completa; senão, usa só somaEPS
      let calcEDPS;
      if (apsMatch) {
        const aps = parseFloat(apsMatch[1]);
        calcEDPS = sumEPS + (sumEPS * (aps - 1));
      } else {
        calcEDPS = sumEPS; 
      }

      equipment.edps = { min: Math.floor(calcEDPS) };
    }
  }

  return Object.keys(equipment).length > 0 ? equipment : null;
}

function getAttributesFromText(text) {
  const attributes = [];
  const lowerText = text.toLowerCase();

  if (lowerText.includes("strength")) attributes.push("strength");
  if (lowerText.includes("dexterity")) attributes.push("dexterity");
  if (lowerText.includes("intelligence")) attributes.push("intelligence");

  return attributes;
}

export function matchStatsOnItem(item, stats) {
  const matched = [];
  for (const category of stats.result) {
    for (const entry of category.entries) {
      if (
        !entry ||
        !["explicit", "implicit", "fractured", "desecrated", "rune", "augment"].includes(entry.type)
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
