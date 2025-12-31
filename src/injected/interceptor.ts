/**
 * Injected script that runs in the page's MAIN world to intercept
 * fetch/XHR requests to the PoE trade API.
 *
 * This script is injected by the content script and communicates
 * back via window.postMessage.
 */

// Trade API URL patterns
const TRADE_API_PATTERN = /\/api\/trade2?\/search\/.+/;

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
    console.log("[PoE Search Interceptor] Triggering sort UI sync:", { field, direction });

    // Wait for results to render
    const attemptClick = (retries = 10) => {
      const sortElement = document.querySelector(`[data-field="${field}"]`) as HTMLElement;
      if (!sortElement) {
        if (retries > 0) {
          setTimeout(() => attemptClick(retries - 1), 200);
        } else {
          console.log("[PoE Search Interceptor] Sort element not found after retries:", field);
        }
        return;
      }

      // Check current sort state
      const classList = sortElement.classList;
      const isSorted = classList.contains("sorted");
      const isAsc = classList.contains("sorted-asc");
      const isDesc = classList.contains("sorted-desc");

      console.log("[PoE Search Interceptor] Sort element state:", { isSorted, isAsc, isDesc, wantDirection: direction });

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
      console.log("[PoE Search Interceptor] Sort UI sync complete");
    };

    // Start attempting after a delay for DOM to render
    setTimeout(() => attemptClick(), 500);
  } catch (e) {
    console.error("[PoE Search Interceptor] Failed to trigger sort UI sync:", e);
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
    console.log(
      "[PoE Search Interceptor] Captured preview image:",
      imageUrl.slice(0, 60) + "..."
    );
  };

  // Try immediately first (results might already be rendered)
  const immediate = tryCapture();
  if (immediate) {
    sendPreviewImage(immediate);
    return;
  }

  // Set up MutationObserver to watch for results
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

// Override fetch
window.fetch = async function (...args: Parameters<typeof fetch>) {
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
    console.log("[PoE Search Interceptor] Checking sort override:", {
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
        console.log("[PoE Search Interceptor] Applied sort override:", overrideData);

        // Store pending sort click for UI sync after results load
        const sortKeys = Object.keys(overrideData);
        if (sortKeys.length > 0) {
          const field = sortKeys[0];
          const direction = overrideData[field];
          localStorage.setItem(PENDING_SORT_CLICK_KEY, JSON.stringify({ field, direction }));
          console.log("[PoE Search Interceptor] Queued sort UI sync:", { field, direction });
        }

        // Clear after use (only apply once)
        localStorage.removeItem(SORT_OVERRIDE_KEY);
      } catch (e) {
        console.error("[PoE Search Interceptor] Failed to apply sort override:", e);
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

      console.log("[PoE Search Interceptor] Captured search:", {
        url,
        total: responseBody.total,
        id: responseBody.id,
      });

      // Trigger sort UI sync if we have a pending sort click
      triggerSortUISync();

      // Capture preview image from first result
      capturePreviewImage(responseBody.id);
    } catch (e) {
      console.error("[PoE Search Interceptor] Failed to parse response:", e);
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
        console.log("[PoE Search Interceptor XHR] Checking sort override:", {
          hasOverride: !!sortOverride,
          override: sortOverride,
          currentSort: (requestBody as { sort?: unknown })?.sort
        });
        if (sortOverride && requestBody && typeof requestBody === "object") {
          try {
            const overrideData = JSON.parse(sortOverride);
            (requestBody as Record<string, unknown>).sort = overrideData;
            body = JSON.stringify(requestBody);
            console.log("[PoE Search Interceptor XHR] Applied sort override:", overrideData);

            // Store pending sort click for UI sync after results load
            // Extract first sort key and direction (e.g., {"stat.implicit.stat_123": "desc"})
            const sortKeys = Object.keys(overrideData);
            if (sortKeys.length > 0) {
              const field = sortKeys[0];
              const direction = overrideData[field];
              localStorage.setItem(PENDING_SORT_CLICK_KEY, JSON.stringify({ field, direction }));
              console.log("[PoE Search Interceptor XHR] Queued sort UI sync:", { field, direction });
            }

            // Clear after use (only apply once)
            localStorage.removeItem(SORT_OVERRIDE_KEY);
          } catch (e) {
            console.error("[PoE Search Interceptor XHR] Failed to apply sort override:", e);
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

        console.log("[PoE Search Interceptor] Captured XHR search:", {
          url: xhr._poeUrl,
          total: responseBody.total,
          id: responseBody.id,
        });

        // Trigger sort UI sync if we have a pending sort click
        triggerSortUISync();

        // Capture preview image from first result
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

// Listen for sort override messages from content script
window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (event.data?.type === "poe-search-set-sort-override" && event.data.sort) {
    sessionStorage.setItem(SORT_OVERRIDE_KEY, JSON.stringify(event.data.sort));
    console.log("[PoE Search Interceptor] Sort override set:", event.data.sort);
  }
});

console.log("[PoE Search Interceptor] Request interceptor installed");
