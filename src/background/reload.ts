/**
 * Development-only background script for auto-reload.
 * Watches dist folder for changes and reloads extension + tabs.
 */

// Simple string hash function
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}

// All scripts to watch for changes
const WATCHED_SCRIPTS = [
  "content.js",
  "interceptor.js",
  "statIdExtractor.js",
];

async function checkForChanges() {
  try {
    // Fetch all watched scripts and combine their hashes
    let combinedHash = 0;
    for (const script of WATCHED_SCRIPTS) {
      try {
        const response = await fetch(
          chrome.runtime.getURL(script) + "?t=" + Date.now(),
          { cache: "no-store" }
        );
        const text = await response.text();
        combinedHash = combinedHash ^ hashCode(text); // XOR hashes together
      } catch {
        // Script might not exist, skip it
      }
    }

    // Check against stored hash
    const stored = await chrome.storage.local.get("_devHash");
    if (stored._devHash && stored._devHash !== combinedHash) {
      console.log("[Extension Reload] Change detected, reloading tabs and extension...");

      // Store new hash FIRST to prevent reload loop
      await chrome.storage.local.set({ _devHash: combinedHash });

      // Reload all matching tabs
      const tabs = await chrome.tabs.query({ url: "https://www.pathofexile.com/trade*" });
      for (const tab of tabs) {
        if (tab.id) {
          chrome.tabs.reload(tab.id);
        }
      }

      // Small delay then reload extension
      setTimeout(() => chrome.runtime.reload(), 100);
      return;
    }
    await chrome.storage.local.set({ _devHash: combinedHash });
  } catch (e) {
    console.log("[Extension Reload] Error checking:", e);
  }
}

// Use setInterval for faster polling in dev (1 second)
setInterval(checkForChanges, 1000);

// Initial check on startup
checkForChanges();

console.log("[Extension Reload] Watching for changes (every 1s)...");

// Heartbeat listener for dev mode indicator in content script
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "DEV_HEARTBEAT_PING") {
    sendResponse({ type: "DEV_HEARTBEAT_PONG" });
  }
  return true; // Keep channel open for async response
});
