import { matchStats } from "./item.js";
import { waitForTradeDiv } from "./ui.js";
import { version } from "../package.json";

console.log(`PoE Item Search v${version}`);

waitForTradeDiv().then((input) => {
  input.addEventListener("paste", (event) => {
    const clipboardText = event.clipboardData.getData("text");
    if (clipboardText) {
      searchForItem(clipboardText);
    }
  });
});

function searchForItem(item) {
  fetch("https://www.pathofexile.com/api/trade2/data/stats")
    .then((response) => response.json())
    .then((data) => {
      const matchedStats = matchStats(item, data);

      const filters = matchedStats.map((stat) => {
        let value = undefined;
        if (stat.value) {
          value = stat.value;
        }

        return {
          id: stat.id,
          ...(value && { value }),
        };
      });

      fetch("https://www.pathofexile.com/api/trade2/search/poe2/Standard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
                filters,
              },
            ],
          },
        }),
      })
        .then((response) => response.json())
        .then((searchResult) => {
          if (searchResult.id) {
            window.location.href = `https://www.pathofexile.com/trade2/search/poe2/Standard/${searchResult.id}`;
          }
          return searchResult;
        });
    });
}
