const SEPARATOR = "--------";
function stripBracketNotation(text) {
  return text.replace(/\[([^\]|]+)\|([^\]]+)\]/g, "$2").replace(/\[([^\]]+)\]/g, "$1");
}
function formatPropertyValue(prop) {
  if (!prop.values || prop.values.length === 0) {
    return "";
  }
  const parts = [];
  for (const [value, augmented] of prop.values) {
    if (augmented === 1) {
      parts.push(`${value} (augmented)`);
    } else {
      parts.push(value);
    }
  }
  return parts.join(", ");
}
function formatProperties(properties) {
  const lines = [];
  for (const prop of properties) {
    const name = stripBracketNotation(prop.name);
    const value = formatPropertyValue(prop);
    if (!value) {
      continue;
    }
    lines.push(`${name}: ${value}`);
  }
  return lines;
}
function formatRequirements(requirements) {
  var _a, _b;
  if (!requirements || requirements.length === 0) {
    return [];
  }
  const parts = [];
  for (const req of requirements) {
    const name = stripBracketNotation(req.name);
    const value = ((_b = (_a = req.values) == null ? void 0 : _a[0]) == null ? void 0 : _b[0]) || "";
    parts.push(`${name}: ${value}`);
  }
  if (parts.length <= 4) {
    const formatted = parts.map((p) => {
      const [name, val] = p.split(": ");
      if (name === "Level") {
        return `Level ${val}`;
      }
      return `${val} ${name}`;
    });
    return [`Requires: ${formatted.join(", ")}`];
  }
  return ["Requirements:", ...parts];
}
function formatSockets(sockets) {
  if (!sockets || sockets.length === 0) {
    return null;
  }
  const socketStr = sockets.map(() => "S").join(" ");
  return `Sockets: ${socketStr}`;
}
function getItemClass(properties) {
  if (!properties || properties.length === 0) {
    return null;
  }
  const classProperty = properties.find((p) => !p.values || p.values.length === 0);
  if (classProperty) {
    return stripBracketNotation(classProperty.name);
  }
  return null;
}
function formatMod(mod, suffix) {
  const cleanMod = stripBracketNotation(mod);
  return suffix ? `${cleanMod} (${suffix})` : cleanMod;
}
function formatItemText(item) {
  const lines = [];
  const itemClass = getItemClass(item.properties);
  if (itemClass) {
    lines.push(`Item Class: ${itemClass}s`);
  }
  lines.push(`Rarity: ${item.rarity}`);
  if (item.name && (item.rarity === "Rare" || item.rarity === "Unique")) {
    lines.push(item.name);
  }
  lines.push(item.typeLine);
  if (item.properties && item.properties.length > 0) {
    const propLines = formatProperties(item.properties);
    if (propLines.length > 0) {
      lines.push(SEPARATOR);
      lines.push(...propLines);
    }
  }
  if (item.requirements && item.requirements.length > 0) {
    lines.push(SEPARATOR);
    lines.push(...formatRequirements(item.requirements));
  }
  const socketsLine = formatSockets(item.sockets);
  if (socketsLine) {
    lines.push(SEPARATOR);
    lines.push(socketsLine);
  }
  lines.push(SEPARATOR);
  lines.push(`Item Level: ${item.ilvl}`);
  if (item.runeMods && item.runeMods.length > 0) {
    lines.push(SEPARATOR);
    for (const mod of item.runeMods) {
      lines.push(formatMod(mod, "rune"));
    }
  }
  if (item.enchantMods && item.enchantMods.length > 0) {
    lines.push(SEPARATOR);
    for (const mod of item.enchantMods) {
      lines.push(formatMod(mod, "enchant"));
    }
  }
  if (item.implicitMods && item.implicitMods.length > 0) {
    lines.push(SEPARATOR);
    for (const mod of item.implicitMods) {
      lines.push(formatMod(mod, "implicit"));
    }
  }
  if (item.explicitMods && item.explicitMods.length > 0) {
    lines.push(SEPARATOR);
    for (const mod of item.explicitMods) {
      lines.push(formatMod(mod));
    }
  }
  if (item.craftedMods && item.craftedMods.length > 0) {
    lines.push(SEPARATOR);
    for (const mod of item.craftedMods) {
      lines.push(formatMod(mod, "crafted"));
    }
  }
  if (item.corrupted) {
    lines.push(SEPARATOR);
    lines.push("Corrupted");
  }
  if (item.flavourText && item.flavourText.length > 0) {
    lines.push(SEPARATOR);
    for (const text of item.flavourText) {
      lines.push(text);
    }
  }
  if (item.note) {
    lines.push(SEPARATOR);
    lines.push(`Note: ${item.note}`);
  }
  return lines.join("\n");
}
const TRADE_SEARCH_PATTERN = /\/api\/trade2?\/search\/.+/;
const TRADE_FETCH_PATTERN = /\/api\/trade2?\/fetch\/.+/;
const itemCache = /* @__PURE__ */ new Map();
const TRADE_API_PATTERN = TRADE_SEARCH_PATTERN;
const SORT_OVERRIDE_KEY = "poe-search-sort-override";
const PENDING_SORT_CLICK_KEY = "poe-search-pending-sort-click";
const PREVIEW_IMAGE_SELECTOR = ".results .row[data-id] img";
function triggerSortUISync() {
  const pendingSort = localStorage.getItem(PENDING_SORT_CLICK_KEY);
  if (!pendingSort) return;
  try {
    const { field, direction } = JSON.parse(pendingSort);
    console.log("[PoE Search Interceptor] Triggering sort UI sync:", { field, direction });
    const attemptClick = (retries = 10) => {
      const sortElement = document.querySelector(`[data-field="${field}"]`);
      if (!sortElement) {
        if (retries > 0) {
          setTimeout(() => attemptClick(retries - 1), 200);
        } else {
          console.log("[PoE Search Interceptor] Sort element not found after retries:", field);
        }
        return;
      }
      const classList = sortElement.classList;
      const isSorted = classList.contains("sorted");
      const isAsc = classList.contains("sorted-asc");
      const isDesc = classList.contains("sorted-desc");
      console.log("[PoE Search Interceptor] Sort element state:", { isSorted, isAsc, isDesc, wantDirection: direction });
      if (direction === "desc") {
        if (!isSorted) {
          sortElement.click();
          setTimeout(() => sortElement.click(), 100);
        } else if (isAsc) {
          sortElement.click();
        }
      } else {
        if (!isSorted) {
          sortElement.click();
        } else if (isDesc) {
          sortElement.click();
        }
      }
      localStorage.removeItem(PENDING_SORT_CLICK_KEY);
      console.log("[PoE Search Interceptor] Sort UI sync complete");
    };
    setTimeout(() => attemptClick(), 500);
  } catch (e) {
    console.error("[PoE Search Interceptor] Failed to trigger sort UI sync:", e);
    localStorage.removeItem(PENDING_SORT_CLICK_KEY);
  }
}
function capturePreviewImage(slug) {
  const maxWaitTime = 5e3;
  const startTime = Date.now();
  const tryCapture = () => {
    const img = document.querySelector(PREVIEW_IMAGE_SELECTOR);
    return (img == null ? void 0 : img.src) || null;
  };
  const sendPreviewImage = (imageUrl) => {
    window.postMessage(
      {
        type: "poe-search-preview-image",
        payload: { slug, imageUrl }
      },
      "*"
    );
    console.log(
      "[PoE Search Interceptor] Captured preview image:",
      imageUrl.slice(0, 60) + "..."
    );
  };
  const immediate = tryCapture();
  if (immediate) {
    sendPreviewImage(immediate);
    return;
  }
  const observer = new MutationObserver((mutations, obs) => {
    const imageUrl = tryCapture();
    if (imageUrl) {
      obs.disconnect();
      sendPreviewImage(imageUrl);
    } else if (Date.now() - startTime > maxWaitTime) {
      obs.disconnect();
      console.log("[PoE Search Interceptor] Preview image capture timed out");
    }
  });
  const resultsContainer = document.querySelector(".results") || document.body;
  observer.observe(resultsContainer, {
    childList: true,
    subtree: true
  });
  setTimeout(() => {
    observer.disconnect();
  }, maxWaitTime);
}
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  var _a, _b;
  let [input, init] = args;
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (((_a = init == null ? void 0 : init.method) == null ? void 0 : _a.toUpperCase()) === "POST" && TRADE_API_PATTERN.test(url)) {
    let requestBody;
    if (init.body) {
      try {
        requestBody = JSON.parse(init.body);
      } catch {
        requestBody = init.body;
      }
    }
    const sortOverride = localStorage.getItem(SORT_OVERRIDE_KEY);
    console.log("[PoE Search Interceptor] Checking sort override:", {
      hasOverride: !!sortOverride,
      override: sortOverride,
      currentSort: requestBody == null ? void 0 : requestBody.sort
    });
    if (sortOverride && requestBody && typeof requestBody === "object") {
      try {
        const overrideData = JSON.parse(sortOverride);
        requestBody.sort = overrideData;
        init = { ...init, body: JSON.stringify(requestBody) };
        console.log("[PoE Search Interceptor] Applied sort override:", overrideData);
        const sortKeys = Object.keys(overrideData);
        if (sortKeys.length > 0) {
          const field = sortKeys[0];
          const direction = overrideData[field];
          localStorage.setItem(PENDING_SORT_CLICK_KEY, JSON.stringify({ field, direction }));
          console.log("[PoE Search Interceptor] Queued sort UI sync:", { field, direction });
        }
        localStorage.removeItem(SORT_OVERRIDE_KEY);
      } catch (e) {
        console.error("[PoE Search Interceptor] Failed to apply sort override:", e);
      }
    }
    const response = await originalFetch.apply(this, [input, init]);
    const clonedResponse = response.clone();
    try {
      const responseBody = await clonedResponse.json();
      window.postMessage(
        {
          type: "poe-search-intercepted",
          payload: {
            url,
            method: "POST",
            requestBody,
            responseBody,
            timestamp: Date.now()
          }
        },
        "*"
      );
      console.log("[PoE Search Interceptor] Captured search:", {
        url,
        total: responseBody.total,
        id: responseBody.id
      });
      triggerSortUISync();
      capturePreviewImage(responseBody.id);
    } catch (e) {
      console.error("[PoE Search Interceptor] Failed to parse response:", e);
    }
    return response;
  }
  if (TRADE_FETCH_PATTERN.test(url)) {
    const response = await originalFetch.apply(this, args);
    const clonedResponse = response.clone();
    try {
      const responseBody = await clonedResponse.json();
      if (responseBody.result) {
        for (const result of responseBody.result) {
          if ((_b = result.item) == null ? void 0 : _b.id) {
            itemCache.set(result.item.id, result.item);
          }
        }
        console.log(
          "[PoE Search Interceptor] Cached",
          responseBody.result.length,
          "items from fetch API"
        );
        wireCopyButtons();
      }
    } catch (e) {
      console.error("[PoE Search Interceptor] Failed to parse fetch response:", e);
    }
    return response;
  }
  return originalFetch.apply(this, args);
};
const originalXHROpen = XMLHttpRequest.prototype.open;
const originalXHRSend = XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.open = function(method, url, async, username, password) {
  const xhr = this;
  xhr._poeUrl = url.toString();
  xhr._poeMethod = method;
  return originalXHROpen.call(
    this,
    method,
    url,
    async ?? true,
    username ?? null,
    password ?? null
  );
};
XMLHttpRequest.prototype.send = function(body) {
  var _a;
  const xhr = this;
  if (xhr._poeUrl && TRADE_FETCH_PATTERN.test(xhr._poeUrl)) {
    xhr.addEventListener("load", function() {
      var _a2;
      try {
        const responseBody = JSON.parse(xhr.responseText);
        if (responseBody.result) {
          for (const result of responseBody.result) {
            if ((_a2 = result.item) == null ? void 0 : _a2.id) {
              itemCache.set(result.item.id, result.item);
            }
          }
          console.log(
            "[PoE Search Interceptor] Cached",
            responseBody.result.length,
            "items from XHR fetch API"
          );
          wireCopyButtons();
        }
      } catch (e) {
        console.error("[PoE Search Interceptor] Failed to parse XHR fetch response:", e);
      }
    });
  }
  if (((_a = xhr._poeMethod) == null ? void 0 : _a.toUpperCase()) === "POST" && xhr._poeUrl && TRADE_API_PATTERN.test(xhr._poeUrl)) {
    let requestBody;
    if (body) {
      try {
        requestBody = JSON.parse(body);
        const sortOverride = localStorage.getItem(SORT_OVERRIDE_KEY);
        console.log("[PoE Search Interceptor XHR] Checking sort override:", {
          hasOverride: !!sortOverride,
          override: sortOverride,
          currentSort: requestBody == null ? void 0 : requestBody.sort
        });
        if (sortOverride && requestBody && typeof requestBody === "object") {
          try {
            const overrideData = JSON.parse(sortOverride);
            requestBody.sort = overrideData;
            body = JSON.stringify(requestBody);
            console.log("[PoE Search Interceptor XHR] Applied sort override:", overrideData);
            const sortKeys = Object.keys(overrideData);
            if (sortKeys.length > 0) {
              const field = sortKeys[0];
              const direction = overrideData[field];
              localStorage.setItem(PENDING_SORT_CLICK_KEY, JSON.stringify({ field, direction }));
              console.log("[PoE Search Interceptor XHR] Queued sort UI sync:", { field, direction });
            }
            localStorage.removeItem(SORT_OVERRIDE_KEY);
          } catch (e) {
            console.error("[PoE Search Interceptor XHR] Failed to apply sort override:", e);
          }
        }
      } catch {
        requestBody = body;
      }
    }
    xhr.addEventListener("load", function() {
      try {
        const responseBody = JSON.parse(xhr.responseText);
        window.postMessage(
          {
            type: "poe-search-intercepted",
            payload: {
              url: xhr._poeUrl,
              method: "POST",
              requestBody,
              responseBody,
              timestamp: Date.now()
            }
          },
          "*"
        );
        console.log("[PoE Search Interceptor] Captured XHR search:", {
          url: xhr._poeUrl,
          total: responseBody.total,
          id: responseBody.id
        });
        triggerSortUISync();
        capturePreviewImage(responseBody.id);
      } catch (e) {
        console.error(
          "[PoE Search Interceptor] Failed to parse XHR response:",
          e
        );
      }
    });
  }
  return originalXHRSend.call(this, body);
};
window.addEventListener("message", (event) => {
  var _a;
  if (event.source !== window) return;
  if (((_a = event.data) == null ? void 0 : _a.type) === "poe-search-set-sort-override" && event.data.sort) {
    sessionStorage.setItem(SORT_OVERRIDE_KEY, JSON.stringify(event.data.sort));
    console.log("[PoE Search Interceptor] Sort override set:", event.data.sort);
  }
});
function showCopyFeedback(button, message) {
  console.log("[PoE Search Interceptor] showCopyFeedback called:", message);
  const tooltip = document.createElement("div");
  tooltip.textContent = message;
  tooltip.setAttribute("data-poe-copy-tooltip", "true");
  Object.assign(tooltip.style, {
    position: "absolute",
    background: "#1a1a1a",
    color: "#8abd1c",
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: "bold",
    zIndex: "10000",
    pointerEvents: "none",
    border: "1px solid #8abd1c",
    boxShadow: "0 2px 8px rgba(0,0,0,0.5)"
  });
  const rect = button.getBoundingClientRect();
  tooltip.style.left = `${rect.left + window.scrollX}px`;
  tooltip.style.top = `${rect.top + window.scrollY - 30}px`;
  document.body.appendChild(tooltip);
  console.log("[PoE Search Interceptor] Tooltip appended to body");
  setTimeout(() => {
    tooltip.style.transition = "opacity 0.3s, transform 0.3s";
    tooltip.style.opacity = "0";
    tooltip.style.transform = "translateY(-10px)";
  }, 1e3);
  setTimeout(() => tooltip.remove(), 1500);
}
function wireCopyButtons() {
  const rows = document.querySelectorAll(".resultset .row[data-id]");
  for (const row of rows) {
    const itemId = row.dataset.id;
    if (!itemId) continue;
    const copyBtn = row.querySelector(".copy");
    if (!copyBtn) continue;
    if (copyBtn.dataset.poeWired === "true") continue;
    copyBtn.classList.remove("hidden");
    copyBtn.style.display = "block";
    copyBtn.dataset.poeWired = "true";
    copyBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const item = itemCache.get(itemId);
      if (!item) {
        console.warn("[PoE Search Interceptor] Item not in cache:", itemId);
        copyBtn.title = "Item not loaded - try refreshing";
        return;
      }
      try {
        const text = formatItemText(item);
        await navigator.clipboard.writeText(text);
        showCopyFeedback(copyBtn, "Copied!");
        console.log("[PoE Search Interceptor] Copied item:", item.name || item.typeLine);
      } catch (err) {
        console.error("[PoE Search Interceptor] Failed to copy:", err);
        showCopyFeedback(copyBtn, "Failed!");
      }
    });
  }
  console.log("[PoE Search Interceptor] Wired copy buttons for", rows.length, "rows");
}
const resultsObserver = new MutationObserver((mutations) => {
  var _a, _b;
  let hasNewRows = false;
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node instanceof HTMLElement) {
        if (((_a = node.matches) == null ? void 0 : _a.call(node, ".row[data-id]")) || ((_b = node.querySelector) == null ? void 0 : _b.call(node, ".row[data-id]"))) {
          hasNewRows = true;
          break;
        }
      }
    }
    if (hasNewRows) break;
  }
  if (hasNewRows) {
    setTimeout(wireCopyButtons, 100);
  }
});
function startResultsObserver() {
  const resultsContainer = document.querySelector(".results");
  if (resultsContainer) {
    resultsObserver.observe(resultsContainer, {
      childList: true,
      subtree: true
    });
    console.log("[PoE Search Interceptor] Results observer started");
    wireCopyButtons();
  } else {
    setTimeout(startResultsObserver, 500);
  }
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startResultsObserver);
} else {
  startResultsObserver();
}
console.log("[PoE Search Interceptor] Request interceptor installed");
