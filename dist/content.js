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

// src/item.js
function getSearchQuery(item, stats) {
  const query = {};
  const regexStats = addRegexToStats(stats);
  const unique = matchUniqueItem(item);
  if (unique) {
    query.term = unique;
  }
  const matched = matchStatsOnItem(item, regexStats);
  const resistanceStats = matched.filter((stat) => stat.id === "explicit.stat_4220027924" || stat.id === "explicit.stat_1671376347" || stat.id === "explicit.stat_3372524247" || stat.id === "explicit.stat_2923486259");
  const attributeStats = matched.filter((stat) => stat.id === "explicit.stat_4080418644" || stat.id === "explicit.stat_3261801346" || stat.id === "explicit.stat_328541901");
  const nonResistanceStats = matched.filter((stat) => stat.id !== "explicit.stat_4220027924" && stat.id !== "explicit.stat_1671376347" && stat.id !== "explicit.stat_3372524247" && stat.id !== "explicit.stat_2923486259" && stat.id !== "explicit.stat_4080418644" && stat.id !== "explicit.stat_3261801346" && stat.id !== "explicit.stat_328541901");
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
    const resistanceFilters = [];
    const resistanceIds = {
      cold: "explicit.stat_4220027924",
      lightning: "explicit.stat_1671376347",
      fire: "explicit.stat_3372524247",
      chaos: "explicit.stat_2923486259"
    };
    let totalWeight = 0;
    resistanceStats.forEach((stat) => {
      const value = parseInt(stat.value.min);
      totalWeight += value;
      resistanceFilters.push({
        id: stat.id,
        value: { weight: 1, min: value },
        disabled: false
      });
    });
    Object.entries(resistanceIds).forEach(([type, id]) => {
      if (!resistanceStats.find((stat) => stat.id === id)) {
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
      value: { min: totalWeight }
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
