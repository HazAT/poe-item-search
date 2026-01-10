/**
 * Injected script that runs in the page's MAIN world to intercept
 * fetch/XHR requests to the PoE trade API.
 *
 * This script is injected by the content script and communicates
 * back via window.postMessage.
 */

import { formatItemText } from "@/utils/itemFormatter";
import type { TradeItem, TradeFetchResponse } from "@/types/tradeItem";

// Logger that forwards to content script via postMessage
const injectedLogger = {
  log: (message: string, data?: unknown) =>
    window.postMessage({ type: "poe-search-debug-log", payload: { level: "log", message: `[Interceptor] ${message}`, data } }, "*"),
  warn: (message: string, data?: unknown) =>
    window.postMessage({ type: "poe-search-debug-log", payload: { level: "warn", message: `[Interceptor] ${message}`, data } }, "*"),
  error: (message: string, data?: unknown) =>
    window.postMessage({ type: "poe-search-debug-log", payload: { level: "error", message: `[Interceptor] ${message}`, data } }, "*"),
};

// Trade API URL patterns
const TRADE_SEARCH_PATTERN = /\/api\/trade2?\/search\/.+/;
const TRADE_FETCH_PATTERN = /\/api\/trade2?\/fetch\/.+/;

// Item cache for copy functionality
const itemCache = new Map<string, TradeItem>();

// Legacy alias for existing code
const TRADE_API_PATTERN = TRADE_SEARCH_PATTERN;

// Key for storing desired sort override
const SORT_OVERRIDE_KEY = "poe-search-sort-override";

// Key for pending sort click (to sync UI after results load)
const PENDING_SORT_CLICK_KEY = "poe-search-pending-sort-click";

// Selector for first item's image in results
const PREVIEW_IMAGE_SELECTOR = ".results .row[data-id] img";

/**
 * Click the sort element to sync the UI after results load.
 * The API returns correctly sorted results, but the UI doesn't reflect the sort state
 * until we click the sort element.
 */
function triggerSortUISync() {
  const pendingSort = localStorage.getItem(PENDING_SORT_CLICK_KEY);
  if (!pendingSort) return;

  try {
    const { field, direction } = JSON.parse(pendingSort);
    injectedLogger.log("Triggering sort UI sync", { field, direction });

    // Wait for results to render
    const attemptClick = (retries = 10) => {
      const sortElement = document.querySelector(`[data-field="${field}"]`) as HTMLElement;
      if (!sortElement) {
        if (retries > 0) {
          setTimeout(() => attemptClick(retries - 1), 200);
        } else {
          injectedLogger.log("Sort element not found after retries: " + field);
        }
        return;
      }

      // Check current sort state
      const classList = sortElement.classList;
      const isSorted = classList.contains("sorted");
      const isAsc = classList.contains("sorted-asc");
      const isDesc = classList.contains("sorted-desc");

      injectedLogger.log("Sort element state", { isSorted, isAsc, isDesc, wantDirection: direction });

      // Click to toggle sort - first click sorts asc, second click sorts desc
      if (direction === "desc") {
        if (!isSorted) {
          // Not sorted yet - click twice (asc then desc)
          sortElement.click();
          setTimeout(() => sortElement.click(), 100);
        } else if (isAsc) {
          // Currently asc - click once for desc
          sortElement.click();
        }
        // Already desc - no action needed
      } else {
        // Want ascending
        if (!isSorted) {
          // Not sorted - click once for asc
          sortElement.click();
        } else if (isDesc) {
          // Currently desc - click once for asc
          sortElement.click();
        }
        // Already asc - no action needed
      }

      // Clear after processing
      localStorage.removeItem(PENDING_SORT_CLICK_KEY);
      injectedLogger.log("Sort UI sync complete");
    };

    // Start attempting after a delay for DOM to render
    setTimeout(() => attemptClick(), 500);
  } catch (e) {
    injectedLogger.error("Failed to trigger sort UI sync", e);
    localStorage.removeItem(PENDING_SORT_CLICK_KEY);
  }
}

/**
 * Capture the first item's preview image URL after results render.
 * Uses MutationObserver with timeout fallback.
 */
function capturePreviewImage(slug: string) {
  const maxWaitTime = 5000; // 5 seconds max
  const startTime = Date.now();

  const tryCapture = (): string | null => {
    const img = document.querySelector(PREVIEW_IMAGE_SELECTOR) as HTMLImageElement;
    return img?.src || null;
  };

  const sendPreviewImage = (imageUrl: string) => {
    window.postMessage(
      {
        type: "poe-search-preview-image",
        payload: { slug, imageUrl },
      },
      "*"
    );
    injectedLogger.log("Captured preview image: " + imageUrl.slice(0, 60) + "...");
  };

  // Try immediately first (results might already be rendered)
  const immediate = tryCapture();
  if (immediate) {
    sendPreviewImage(immediate);
    return;
  }

  // Set up MutationObserver to watch for results
  const observer = new MutationObserver((_mutations, obs) => {
    const imageUrl = tryCapture();
    if (imageUrl) {
      obs.disconnect();
      sendPreviewImage(imageUrl);
    } else if (Date.now() - startTime > maxWaitTime) {
      obs.disconnect();
      injectedLogger.log("Preview image capture timed out");
    }
  });

  const resultsContainer = document.querySelector(".results") || document.body;
  observer.observe(resultsContainer, {
    childList: true,
    subtree: true,
  });

  // Fallback timeout to disconnect observer
  setTimeout(() => {
    observer.disconnect();
  }, maxWaitTime);
}

export interface TradeSearchInterceptedPayload {
  url: string;
  method: string;
  requestBody: unknown;
  responseBody: {
    id: string;
    total: number;
    result?: string[];
  };
  timestamp: number;
}

// Store original fetch
const originalFetch = window.fetch;

// Override fetch (cast to any to avoid TypeScript issues with fetch.preconnect)
(window as any).fetch = async function (...args: Parameters<typeof fetch>) {
  let [input, init] = args;
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;

  // Check if this is a trade search POST
  if (init?.method?.toUpperCase() === "POST" && TRADE_API_PATTERN.test(url)) {
    let requestBody: unknown;

    // Parse request body
    if (init.body) {
      try {
        requestBody = JSON.parse(init.body as string);
      } catch {
        requestBody = init.body;
      }
    }

    // Check for sort override from history/bookmark execution (using localStorage)
    const sortOverride = localStorage.getItem(SORT_OVERRIDE_KEY);
    injectedLogger.log("Checking sort override", {
      hasOverride: !!sortOverride,
      override: sortOverride,
      currentSort: (requestBody as { sort?: unknown })?.sort
    });
    if (sortOverride && requestBody && typeof requestBody === "object") {
      try {
        const overrideData = JSON.parse(sortOverride);
        (requestBody as Record<string, unknown>).sort = overrideData;
        // Update the init.body with modified payload
        init = { ...init, body: JSON.stringify(requestBody) };
        injectedLogger.log("Applied sort override", overrideData);

        // Store pending sort click for UI sync after results load
        const sortKeys = Object.keys(overrideData);
        if (sortKeys.length > 0) {
          const field = sortKeys[0];
          const direction = overrideData[field];
          localStorage.setItem(PENDING_SORT_CLICK_KEY, JSON.stringify({ field, direction }));
          injectedLogger.log("Queued sort UI sync", { field, direction });
        }

        // Clear after use (only apply once)
        localStorage.removeItem(SORT_OVERRIDE_KEY);
      } catch (e) {
        injectedLogger.error("Failed to apply sort override", e);
      }
    }

    // Execute original fetch
    const response = await originalFetch.apply(this, [input, init]);

    // Clone response to read body without consuming it
    const clonedResponse = response.clone();

    try {
      const responseBody = await clonedResponse.json();

      // Send intercepted data to content script
      window.postMessage(
        {
          type: "poe-search-intercepted",
          payload: {
            url,
            method: "POST",
            requestBody,
            responseBody,
            timestamp: Date.now(),
          } as TradeSearchInterceptedPayload,
        },
        "*"
      );

      injectedLogger.log("Captured search", {
        url,
        total: responseBody.total,
        id: responseBody.id,
      });

      // Trigger sort UI sync if we have a pending sort click
      triggerSortUISync();

      // Capture preview image from first result
      capturePreviewImage(responseBody.id);
    } catch (e) {
      injectedLogger.error("Failed to parse response", e);
    }

    return response;
  }

  // Check if this is a trade fetch GET (item details)
  if (TRADE_FETCH_PATTERN.test(url)) {
    const response = await originalFetch.apply(this, args);
    const clonedResponse = response.clone();

    try {
      const responseBody = (await clonedResponse.json()) as TradeFetchResponse;

      // Cache items by ID for copy functionality
      if (responseBody.result) {
        for (const result of responseBody.result) {
          if (result.item?.id) {
            itemCache.set(result.item.id, result.item);
          }
        }
        injectedLogger.log("Cached " + responseBody.result.length + " items from fetch API");

        // Wire up copy buttons for newly loaded items
        wireCopyButtons();
      }
    } catch (e) {
      injectedLogger.error("Failed to parse fetch response", e);
    }

    return response;
  }

  return originalFetch.apply(this, args);
};

// Also intercept XMLHttpRequest for completeness
const originalXHROpen = XMLHttpRequest.prototype.open;
const originalXHRSend = XMLHttpRequest.prototype.send;

interface ExtendedXHR extends XMLHttpRequest {
  _poeUrl?: string;
  _poeMethod?: string;
}

XMLHttpRequest.prototype.open = function (
  method: string,
  url: string | URL,
  async?: boolean,
  username?: string | null,
  password?: string | null
) {
  const xhr = this as ExtendedXHR;
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

XMLHttpRequest.prototype.send = function (
  body?: Document | XMLHttpRequestBodyInit | null
) {
  const xhr = this as ExtendedXHR;

  // Handle trade fetch GET (item details)
  if (xhr._poeUrl && TRADE_FETCH_PATTERN.test(xhr._poeUrl)) {
    xhr.addEventListener("load", function () {
      try {
        const responseBody = JSON.parse(xhr.responseText) as TradeFetchResponse;

        // Cache items by ID for copy functionality
        if (responseBody.result) {
          for (const result of responseBody.result) {
            if (result.item?.id) {
              itemCache.set(result.item.id, result.item);
            }
          }
          injectedLogger.log("[XHR] Cached " + responseBody.result.length + " items from fetch API");

          // Wire up copy buttons for newly loaded items
          wireCopyButtons();
        }
      } catch (e) {
        injectedLogger.error("[XHR] Failed to parse fetch response", e);
      }
    });
  }

  if (
    xhr._poeMethod?.toUpperCase() === "POST" &&
    xhr._poeUrl &&
    TRADE_API_PATTERN.test(xhr._poeUrl)
  ) {
    let requestBody: unknown;

    if (body) {
      try {
        requestBody = JSON.parse(body as string);

        // Check for sort override from history/bookmark execution (using localStorage)
        const sortOverride = localStorage.getItem(SORT_OVERRIDE_KEY);
        injectedLogger.log("[XHR] Checking sort override", {
          hasOverride: !!sortOverride,
          override: sortOverride,
          currentSort: (requestBody as { sort?: unknown })?.sort
        });
        if (sortOverride && requestBody && typeof requestBody === "object") {
          try {
            const overrideData = JSON.parse(sortOverride);
            (requestBody as Record<string, unknown>).sort = overrideData;
            body = JSON.stringify(requestBody);
            injectedLogger.log("[XHR] Applied sort override", overrideData);

            // Store pending sort click for UI sync after results load
            // Extract first sort key and direction (e.g., {"stat.implicit.stat_123": "desc"})
            const sortKeys = Object.keys(overrideData);
            if (sortKeys.length > 0) {
              const field = sortKeys[0];
              const direction = overrideData[field];
              localStorage.setItem(PENDING_SORT_CLICK_KEY, JSON.stringify({ field, direction }));
              injectedLogger.log("[XHR] Queued sort UI sync", { field, direction });
            }

            // Clear after use (only apply once)
            localStorage.removeItem(SORT_OVERRIDE_KEY);
          } catch (e) {
            injectedLogger.error("[XHR] Failed to apply sort override", e);
          }
        }
      } catch {
        requestBody = body;
      }
    }

    xhr.addEventListener("load", function () {
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
              timestamp: Date.now(),
            } as TradeSearchInterceptedPayload,
          },
          "*"
        );

        injectedLogger.log("[XHR] Captured search", {
          url: xhr._poeUrl,
          total: responseBody.total,
          id: responseBody.id,
        });

        // Trigger sort UI sync if we have a pending sort click
        triggerSortUISync();

        // Capture preview image from first result
        capturePreviewImage(responseBody.id);
      } catch (e) {
        injectedLogger.error("[XHR] Failed to parse response", e);
      }
    });
  }

  return originalXHRSend.call(this, body);
};

// Listen for sort override messages from content script
window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (event.data?.type === "poe-search-set-sort-override" && event.data.sort) {
    sessionStorage.setItem(SORT_OVERRIDE_KEY, JSON.stringify(event.data.sort));
    injectedLogger.log("Sort override set", event.data.sort);
  }
});

/**
 * Show a brief visual feedback tooltip near the button.
 */
function showCopyFeedback(button: HTMLElement, message: string) {
  injectedLogger.log("showCopyFeedback called: " + message);

  // Create tooltip element
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
    boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
  });

  // Position tooltip above the button
  const rect = button.getBoundingClientRect();
  tooltip.style.left = `${rect.left + window.scrollX}px`;
  tooltip.style.top = `${rect.top + window.scrollY - 30}px`;

  document.body.appendChild(tooltip);
  injectedLogger.log("Tooltip appended to body");

  // Fade out and remove
  setTimeout(() => {
    tooltip.style.transition = "opacity 0.3s, transform 0.3s";
    tooltip.style.opacity = "0";
    tooltip.style.transform = "translateY(-10px)";
  }, 1000);

  setTimeout(() => tooltip.remove(), 1500);
}

/**
 * Wire up copy buttons on result rows.
 * Finds all .copy buttons, enables them, and adds click handlers.
 */
function wireCopyButtons() {
  const rows = document.querySelectorAll(".resultset .row[data-id]");

  for (const row of rows) {
    const itemId = (row as HTMLElement).dataset.id;
    if (!itemId) continue;

    const copyBtn = row.querySelector(".copy") as HTMLButtonElement;
    if (!copyBtn) continue;

    // Skip if already wired
    if (copyBtn.dataset.poeWired === "true") continue;

    // Enable the button
    copyBtn.classList.remove("hidden");
    copyBtn.style.display = "block";
    copyBtn.dataset.poeWired = "true";

    // Add click handler
    copyBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const item = itemCache.get(itemId);
      if (!item) {
        injectedLogger.warn("Item not in cache: " + itemId);
        copyBtn.title = "Item not loaded - try refreshing";
        return;
      }

      try {
        const text = formatItemText(item);
        await navigator.clipboard.writeText(text);

        // Send log to content script for Sentry logging
        window.postMessage({
          type: "poe-search-item-copied",
          payload: {
            itemText: text,
            itemName: item.name || item.typeLine,
            itemId: itemId,
          },
        }, "*");

        // Visual feedback - show a temporary tooltip
        showCopyFeedback(copyBtn, "Copied!");

        injectedLogger.log("Copied item: " + (item.name || item.typeLine), item);
      } catch (err) {
        injectedLogger.error("Failed to copy", err);
        showCopyFeedback(copyBtn, "Failed!");
      }
    });
  }

  injectedLogger.log("Wired copy buttons for " + rows.length + " rows");
}

// Set up MutationObserver to wire copy buttons as new rows are added
const resultsObserver = new MutationObserver((mutations) => {
  // Check if any result rows were added
  let hasNewRows = false;
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node instanceof HTMLElement) {
        if (node.matches?.(".row[data-id]") || node.querySelector?.(".row[data-id]")) {
          hasNewRows = true;
          break;
        }
      }
    }
    if (hasNewRows) break;
  }

  if (hasNewRows) {
    // Debounce to avoid excessive calls
    setTimeout(wireCopyButtons, 100);
  }
});

// Start observing when results container exists
function startResultsObserver() {
  const resultsContainer = document.querySelector(".results");
  if (resultsContainer) {
    resultsObserver.observe(resultsContainer, {
      childList: true,
      subtree: true,
    });
    injectedLogger.log("Results observer started");
    // Initial wire-up
    wireCopyButtons();
  } else {
    // Retry if container doesn't exist yet
    setTimeout(startResultsObserver, 500);
  }
}

// Start observer when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startResultsObserver);
} else {
  startResultsObserver();
}

injectedLogger.log("Request interceptor installed");
