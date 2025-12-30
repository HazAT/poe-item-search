const TRADE_API_PATTERN = /\/api\/trade2?\/search\/.+/;
const SORT_OVERRIDE_KEY = "poe-search-sort-override";
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  var _a;
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
    } catch (e) {
      console.error("[PoE Search Interceptor] Failed to parse response:", e);
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
console.log("[PoE Search Interceptor] Request interceptor installed");
