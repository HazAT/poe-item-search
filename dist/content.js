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
function matchStats(item, stats) {
  const regexStats = addRegexToStats(stats);
  const matched = matchStatsOnItem(item, regexStats);
  return matched;
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
        input.placeholder = "Paste item here...";
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
waitForTradeDiv().then((input) => {
  input.addEventListener("paste", (event) => {
    const clipboardText = event.clipboardData.getData("text");
    if (clipboardText) {
      searchForItem$1(clipboardText);
    }
  });
});
function searchForItem$1(item) {
  fetch("https://www.pathofexile.com/api/trade2/data/stats").then((response) => response.json()).then((data) => {
    const matchedStats = matchStats(item, data);
    const filters = matchedStats.map((stat) => {
      let value = void 0;
      if (stat.value) {
        value = stat.value;
      }
      return {
        id: stat.id,
        ...value && { value }
      };
    });
    fetch("https://www.pathofexile.com/api/trade2/search/poe2/Standard", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query: {
          // filters: {
          //   type_filters: {
          //     filters: {
          //       category: {
          //         option: "armour.helmet",
          //       },
          //     },
          //   },
          // },
          stats: [
            {
              type: "and",
              filters
            }
          ]
        }
      })
    }).then((response) => response.json()).then((searchResult) => {
      if (searchResult.id) {
        window.location.href = `https://www.pathofexile.com/trade2/search/poe2/Standard/${searchResult.id}`;
      }
      return searchResult;
    });
  });
}
