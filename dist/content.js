// src/stat.js
function addRegexToStat(stat) {
  if (!stat)
    return null;
  let regexPattern = stat.text.replaceAll("+", "\\+").replaceAll("#", "(?:\\+|-)?(\\d+(?:.\\d+)?)?").replace(/\[([^\]]+)\]/g, (_, group) => {
    const options = group.split("|");
    return `(?:${options.join("|")})`;
  });
  let isImplicit = false;
  if (stat.text.includes("(implicit)")) {
    stat.type = "implicit";
    isImplicit = true;
  }
  if (stat.type === "implicit" || isImplicit) {
    regexPattern += " \\(implicit\\)";
  } else {
    regexPattern += "(?! \\(implicit\\))";
  }
  return {
    ...stat,
    regex: new RegExp(`^${regexPattern}$`, "gm")
  };
}
function addRegexToStats(stats) {
  const newEntries = [];
  stats.result.map((category) => {
    newEntries.push({
      ...category,
      entries: category.entries.map((entry) => {
        return addRegexToStat(entry);
      })
    });
  });
  return { result: newEntries };
}

// src/itemClass.js
var CACHE_TTL = 1000 * 60 * 60;
var ITEM_CLASS_TO_CATEGORY = {
  Claws: "weapon.claw",
  Daggers: "weapon.dagger",
  "One Hand Swords": "weapon.onesword",
  "One Hand Axes": "weapon.oneaxe",
  "One Hand Maces": "weapon.onemace",
  Spears: "weapon.spear",
  Flails: "weapon.flail",
  "Two Hand Swords": "weapon.twosword",
  "Two Hand Axes": "weapon.twoaxe",
  "Two Hand Maces": "weapon.twomace",
  Quarterstaves: "weapon.warstaff",
  Bows: "weapon.bow",
  Crossbows: "weapon.crossbow",
  Wands: "weapon.wand",
  Sceptres: "weapon.sceptre",
  Staves: "weapon.staff",
  Talismans: "weapon.talisman",
  "Fishing Rods": "weapon.rod",
  Helmets: "armour.helmet",
  "Body Armours": "armour.chest",
  Gloves: "armour.gloves",
  Boots: "armour.boots",
  Quivers: "armour.quiver",
  Shields: "armour.shield",
  Foci: "armour.focus",
  Bucklers: "armour.buckler",
  Amulets: "accessory.amulet",
  Belts: "accessory.belt",
  Rings: "accessory.ring",
  "Life Flasks": "flask.life",
  "Mana Flasks": "flask.mana",
  "Skill Gems": "gem.activegem",
  "Support Gems": "gem.supportgem",
  "Meta Gems": "gem.metagem",
  Jewels: "jewel",
  Waystones: "map.waystone",
  "Map Fragments": "map.fragment",
  "Expedition Logbooks": "map.logbook",
  Breachstones: "map.breachstone",
  Runes: "currency.rune",
  "Soul Cores": "currency.soulcore",
  "Divination Cards": "card",
  Relics: "sanctum.relic"
};
function extractItemClass(itemText) {
  if (!itemText || typeof itemText !== "string") {
    return;
  }
  const match = itemText.match(/^Item Class: (.+)$/m);
  return match ? match[1].trim() : undefined;
}
function getCategoryForItemClass(itemClass) {
  if (!itemClass) {
    return;
  }
  return ITEM_CLASS_TO_CATEGORY[itemClass];
}
function getCategoryFromItemText(itemText) {
  const itemClass = extractItemClass(itemText);
  return getCategoryForItemClass(itemClass);
}
function buildTypeFilters(itemText) {
  const category = getCategoryFromItemText(itemText);
  if (!category) {
    return;
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

// src/item.js
function getSearchQuery(item, stats) {
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
  const matched = matchStatsOnItem(item, regexStats);
  const resistanceMapping = {
    "explicit.stat_3372524247": "pseudo.pseudo_total_fire_resistance",
    "explicit.stat_4220027924": "pseudo.pseudo_total_cold_resistance",
    "explicit.stat_1671376347": "pseudo.pseudo_total_lightning_resistance",
    "explicit.stat_2923486259": "pseudo.pseudo_total_chaos_resistance"
  };
  const resistanceExplicitIds = Object.keys(resistanceMapping);
  const resistanceStats = matched.filter((stat) => resistanceExplicitIds.includes(stat.id));
  const attributeStats = matched.filter((stat) => stat.id === "explicit.stat_4080418644" || stat.id === "explicit.stat_3261801346" || stat.id === "explicit.stat_328541901");
  const nonResistanceStats = matched.filter((stat) => !resistanceExplicitIds.includes(stat.id) && stat.id !== "explicit.stat_4080418644" && stat.id !== "explicit.stat_3261801346" && stat.id !== "explicit.stat_328541901");
  const statsArray = [];
  if (nonResistanceStats.length > 0) {
    const nonResistanceFilters = nonResistanceStats.map((stat) => ({
      id: stat.id,
      ...stat.value && { value: stat.value }
    }));
    statsArray.push({
      type: "and",
      filters: nonResistanceFilters
    });
  }
  if (resistanceStats.length > 0) {
    const resistanceFilters = resistanceStats.map((stat) => ({
      id: resistanceMapping[stat.id],
      value: { min: parseInt(stat.value.min) }
    }));
    statsArray.push({
      type: "weight",
      filters: resistanceFilters
    });
  }
  if (attributeStats.length > 0) {
    const attributeFilters = [];
    const attributeIds = {
      strength: "explicit.stat_4080418644",
      dexterity: "explicit.stat_3261801346",
      intelligence: "explicit.stat_328541901"
    };
    let totalWeight = 0;
    attributeStats.forEach((stat) => {
      const value = parseInt(stat.value.min);
      totalWeight += value;
      attributeFilters.push({
        id: stat.id,
        value: { weight: 1, min: value },
        disabled: false
      });
    });
    Object.entries(attributeIds).forEach(([type, id]) => {
      if (!attributeStats.find((stat) => stat.id === id)) {
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
      value: { min: totalWeight }
    });
  }
  query.stats = statsArray;
  return query;
}
function matchUniqueItem(item) {
  const uniqueRegex = /Rarity: Unique\n([^\n]+)/;
  const match = item.match(uniqueRegex);
  return match ? match[1] : undefined;
}
function matchStatsOnItem(item, stats) {
  const matched = [];
  for (const category of stats.result) {
    for (const entry of category.entries) {
      if (!entry || entry.type !== "explicit" && entry.type !== "implicit") {
        continue;
      }
      let m;
      while ((m = entry.regex.exec(item)) !== null) {
        if (m.index === entry.regex.lastIndex) {
          entry.regex.lastIndex++;
        }
        m.forEach((match, groupIndex) => {
          if (groupIndex === 0) {
            return;
          }
          const matchedEntry = { ...entry, value: { min: match } };
          if (entry.text.includes("(implicit)")) {
            matchedEntry.type = "implicit";
          }
          matched.push(matchedEntry);
        });
      }
    }
  }
  const uniqueMatched = matched.filter((entry, index, self) => index === self.findIndex((e) => e.text === entry.text && e.type === entry.type));
  return uniqueMatched;
}

// src/ui.js
function waitForTradeDiv() {
  return new Promise((resolve, reject) => {
    const checkInterval = setInterval(() => {
      const searchLeft = document.querySelector("#trade div.search-left");
      if (searchLeft && searchLeft.offsetParent !== null) {
        clearInterval(checkInterval);
        const searchSelect = document.querySelector("#trade div.search-left div.multiselect.search-select");
        searchSelect.style.width = "60%";
        searchSelect.style.float = "left";
        const pasteDiv = document.createElement("div");
        pasteDiv.className = "multiselect search-select paste-item";
        pasteDiv.style.width = "40%";
        pasteDiv.style.float = "left";
        searchLeft.appendChild(pasteDiv);
        const multiselectTags = document.createElement("div");
        multiselectTags.className = "multiselect__tags";
        const input = document.createElement("input");
        input.type = "text";
        input.className = "multiselect__input";
        input.placeholder = "Paste in-game item here...";
        input.addEventListener("keyup", (event) => {
          if (event.key === "Enter") {
            searchForItem(event.target.value);
          }
        });
        multiselectTags.appendChild(input);
        pasteDiv.appendChild(multiselectTags);
        resolve(input);
      }
    }, 300);
    setTimeout(() => {
      clearInterval(checkInterval);
      reject("Timeout: Trade div not found");
    }, 30000);
  });
}
// package.json
var version = "1.1.0";

// src/content.js
console.log(`PoE Item Search v${version}`);
function getTradeInfo() {
  const currentUrl = window.location.href;
  const tradeVersion = currentUrl.includes("trade2") ? "trade2" : "trade";
  const match = currentUrl.match(/\/(?:trade2?)(.+$)/);
  let tradePath = match ? match[1] : "/search/poe2/Standard";
  return { tradeVersion, tradePath };
}
waitForTradeDiv().then((input) => {
  input.addEventListener("paste", (event) => {
    const clipboardText = event.clipboardData.getData("text");
    if (clipboardText) {
      searchForItem2(clipboardText);
    }
  });
}).catch((error) => {
  console.error(error);
});
function searchForItem2(item) {
  const tradeButton = document.querySelector("#trade button.btn.clear-btn");
  if (tradeButton) {
    tradeButton.click();
  }
  const { tradeVersion, tradePath } = getTradeInfo();
  fetch(`https://www.pathofexile.com/api/${tradeVersion}/data/stats`).then((response) => response.json()).then((data) => {
    const query = getSearchQuery(item, data);
    fetch(`https://www.pathofexile.com/api/${tradeVersion}${tradePath}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query
      })
    }).then((response) => response.json()).then((searchResult) => {
      if (searchResult.id) {
        window.location.href = `https://www.pathofexile.com/${tradeVersion}${tradePath}/${searchResult.id}`;
      }
      return searchResult;
    });
  });
}
