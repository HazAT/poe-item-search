/**
 * Injected script that runs in the page's MAIN world to extract
 * Vue stat IDs and store them as data attributes on filter elements.
 *
 * This allows the content script to access stat IDs without needing
 * to access Vue's internal __vue__ property (which is isolated).
 */

// Logger that forwards to content script via postMessage
// Note: Named uniquely to avoid collision with interceptor.js in MAIN world
const statIdLogger = {
  log: (message: string, data?: unknown) =>
    window.postMessage({ type: "poe-search-debug-log", payload: { level: "log", message: `[StatIdExtractor] ${message}`, data } }, "*"),
};

function extractStatIds(): void {
  const filters = document.querySelectorAll('.filter.full-span');
  let extracted = 0;
  filters.forEach(filter => {
    if ((filter as HTMLElement).dataset.statId) return;

    const vue = (filter as any).__vue__;
    const statId = vue?.$props?.filter?.id;
    if (statId) {
      (filter as HTMLElement).dataset.statId = statId;
      extracted++;
    }
  });
  if (extracted > 0) {
    statIdLogger.log('Extracted ' + extracted + ' stat IDs');
    // Dispatch event so content script knows stat IDs are ready
    document.dispatchEvent(new CustomEvent('poe-stat-ids-extracted', { detail: { count: extracted } }));
  }
}

// Run immediately
extractStatIds();

// Set up observer on #trade or document.body
function setupObserver(): void {
  const target = document.querySelector('#trade') || document.body;

  const observer = new MutationObserver((_mutations) => {
    // Only log occasionally to avoid spam
    const now = Date.now();
    if (!((window as any).__lastMutationLog) || now - (window as any).__lastMutationLog > 1000) {
      statIdLogger.log('Mutation detected, extracting...');
      (window as any).__lastMutationLog = now;
    }

    // Debounce
    clearTimeout((window as any).__statIdExtractorTimeout);
    (window as any).__statIdExtractorTimeout = setTimeout(extractStatIds, 100);
  });

  observer.observe(target, { childList: true, subtree: true, attributes: true });
  statIdLogger.log('Observing ' + (target === document.body ? 'body' : '#trade'));
}

// Wait for #trade to exist, or fall back to body
if (document.querySelector('#trade')) {
  setupObserver();
} else {
  // Retry a few times waiting for #trade
  let retries = 0;
  const waitForTrade = setInterval(() => {
    retries++;
    if (document.querySelector('#trade') || retries > 20) {
      clearInterval(waitForTrade);
      setupObserver();
    }
  }, 100);
}

// Also poll periodically as backup (MutationObserver can miss Vue updates)
setInterval(() => {
  const filters = document.querySelectorAll('.filter.full-span');
  const needsExtraction = Array.from(filters).some(f => {
    const el = f as HTMLElement;
    return !el.dataset.statId && (f as any).__vue__;
  });
  if (needsExtraction) {
    extractStatIds();
  }
}, 500);

// Expose for debugging
(window as any).__extractStatIds = extractStatIds;

statIdLogger.log('Initialized');
