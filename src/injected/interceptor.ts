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
