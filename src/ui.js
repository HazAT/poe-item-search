export function waitForTradeDiv() {
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
    }, 30000);
  });
}
