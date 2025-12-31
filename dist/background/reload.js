function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash;
}
async function checkForChanges() {
  try {
    const response = await fetch(
      chrome.runtime.getURL("content.js") + "?t=" + Date.now(),
      { cache: "no-store" }
    );
    const text = await response.text();
    const hash = hashCode(text);
    const stored = await chrome.storage.local.get("_devHash");
    if (stored._devHash && stored._devHash !== hash) {
      console.log("[Extension Reload] Change detected, reloading tabs and extension...");
      await chrome.storage.local.set({ _devHash: hash });
      const tabs = await chrome.tabs.query({ url: "https://www.pathofexile.com/trade*" });
      for (const tab of tabs) {
        if (tab.id) {
          chrome.tabs.reload(tab.id);
        }
      }
      setTimeout(() => chrome.runtime.reload(), 100);
      return;
    }
    await chrome.storage.local.set({ _devHash: hash });
  } catch (e) {
    console.log("[Extension Reload] Error checking:", e);
  }
}
setInterval(checkForChanges, 1e3);
checkForChanges();
console.log("[Extension Reload] Watching for changes (every 1s)...");
