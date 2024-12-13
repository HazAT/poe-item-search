function addRegexToStat(stat) {
  if (stat.text.match(/\(implicit\)/) && stat.type !== "implicit") {
    return null;
  }
  let regexPattern = stat.text.replaceAll("+", "\\+").replaceAll("#", "(?:\\+|-)?(\\d+(?:.\\d+)?)?").replace(/\[([^\]]+)\]/g, (_, group) => {
    const options = group.split("|");
    return `(?:${options.join("|")})`;
  });
  return {
    ...stat,
    regex: new RegExp(`${regexPattern}`)
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
function getSearchQuery(item, stats) {
  const query = {};
  const regexStats = addRegexToStats(stats);
  const unique = matchUnique(item);
  if (unique) {
    query.term = unique;
  } else {
    const matched = matchStatsOnItem(item, regexStats);
    const filters = matched.map((stat) => {
      let value;
      if (stat.value) {
        value = stat.value;
      }
      return {
        id: stat.id,
        ...value && { value }
      };
    });
    query.stats = // filters: {
    //   type_filters: {
    //     filters: {
    //       category: {
    //         option: "armour.helmet",
    //       },
    //     },
    //   },
    // },
    [
      {
        type: "and",
        filters
      }
    ];
  }
  return query;
}
function matchUnique(item) {
  const uniqueRegex = /Rarity: Unique\n([^\n]+)/;
  const match = item.match(uniqueRegex);
  return match ? match[1] : void 0;
}
function matchStatsOnItem(item, stats) {
  const matched = [];
  for (const category of stats.result) {
    for (const entry of category.entries) {
      if (entry.type !== "explicit") {
        continue;
      }
      const match = item.match(entry.regex);
      if (match) {
        entry.value = {};
        if (match[1]) {
          entry.value.min = match[1];
        }
        if (match[2]) {
          entry.value.max = match[2];
        }
        matched.push(entry);
      }
    }
  }
  return matched;
}
function waitForTradeDiv() {
  return new Promise((resolve, reject) => {
    const checkInterval = setInterval(() => {
      const searchLeft = document.querySelector("#trade div.search-left");
      if (searchLeft && searchLeft.offsetParent !== null) {
        clearInterval(checkInterval);
        const searchSelect = document.querySelector(
          "#trade div.search-left div.multiselect.search-select"
        );
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
    }, 3e4);
  });
}
const version = "1.0.0";
console.log(`PoE Item Search v${version}`);
function getTradeInfo() {
  const currentUrl = window.location.href;
  const tradeVersion = currentUrl.includes("trade2") ? "trade2" : "trade";
  const match = currentUrl.match(/\/(?:trade2?)(.+$)/);
  const tradePath = match ? match[1] : "/search/poe2/Standard";
  return { tradeVersion, tradePath };
}
waitForTradeDiv().then((input) => {
  input.addEventListener("paste", (event) => {
    const clipboardText = event.clipboardData.getData("text");
    if (clipboardText) {
      searchForItem$1(clipboardText);
    }
  });
}).catch((error) => {
  console.error(error);
});
function searchForItem$1(item) {
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
