import { getSearchQuery } from "./item.js";
import { waitForTradeDiv } from "./ui.js";
import { version } from "../package.json";

console.log(`PoE Item Search v${version}`);

function getTradeInfo() {
  const currentUrl = window.location.href;
  const tradeVersion = currentUrl.includes('trade2') ? 'trade2' : 'trade';
  
  // Extract everything after trade or trade2 in the URL
  const match = currentUrl.match(/\/(?:trade2?)(.+$)/);
  let tradePath = match ? match[1] : '/search/poe2/Standard';

  return { tradeVersion, tradePath };
}

waitForTradeDiv().then((input) => {
  input.addEventListener("paste", (event) => {
    const clipboardText = event.clipboardData.getData("text");
    if (clipboardText) {
      searchForItem(clipboardText);
    }
  });
}).catch((error) => {
  console.error(error);
});

function searchForItem(item) {
  // Clear the trade search
  const tradeButton = document.querySelector('#trade button.btn.clear-btn');
  if (tradeButton) {
    tradeButton.click();
  }

  const { tradeVersion, tradePath } = getTradeInfo();
  
  
  fetch(`https://www.pathofexile.com/api/${tradeVersion}/data/stats`)
    .then((response) => response.json())
    .then((data) => {
      const query = getSearchQuery(item, data);

      fetch(`https://www.pathofexile.com/api/${tradeVersion}${tradePath}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: query,
        }),
      })
        .then((response) => response.json())
        .then((searchResult) => {
          if (searchResult.id) {
            window.location.href = `https://www.pathofexile.com/${tradeVersion}${tradePath}/${searchResult.id}`;
          }
          return searchResult;
        });
    });
}
