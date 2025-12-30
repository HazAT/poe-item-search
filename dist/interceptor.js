const TRADE_API_PATTERN = /\/api\/trade2?\/search\/.+/;
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  var _a;
  const [input, init] = args;
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
    const response = await originalFetch.apply(this, args);
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
console.log("[PoE Search Interceptor] Request interceptor installed");
