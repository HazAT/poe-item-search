interface VueStatFilterElement extends HTMLElement {
  __vue__?: { $props?: { filter?: { id?: unknown } } };
}

const FILTER_SELECTOR = '.filter.full-span';

export function startStatIdObserver() {
  let target: Element | null = null;
  let extractionTimer: ReturnType<typeof setTimeout> | undefined;
  const log = (message: string) => window.postMessage({
    type: 'poe-search-debug-log', payload: { level: 'log', message: `[StatIdExtractor] ${message}` },
  }, '*');

  const extract = () => {
    if (!target) return;
    let changed = 0;
    for (const filter of target.querySelectorAll<VueStatFilterElement>(FILTER_SELECTOR)) {
      const statId = filter.__vue__?.$props?.filter?.id;
      if (typeof statId === 'string' && statId) {
        if (filter.dataset.statId === statId) continue;
        filter.dataset.statId = statId;
        changed++;
      } else if (filter.__vue__ && filter.dataset.statId) {
        delete filter.dataset.statId;
        changed++;
      }
    }
    if (changed) {
      log(`Updated ${changed} stat IDs`);
      document.dispatchEvent(new CustomEvent('poe-stat-ids-extracted', { detail: { count: changed } }));
    }
  };

  const observer = new MutationObserver(records => {
    const ignored = '.multiselect__content-wrapper, .results, .tier-dropdown-injected';
    const rowsChanged = records.some(record => {
      if (record.target instanceof Element && record.target.closest(ignored)) return false;
      return [...record.addedNodes, ...record.removedNodes].some(node =>
        node instanceof Element && !node.matches(ignored) && (node.matches(FILTER_SELECTOR) || node.querySelector(FILTER_SELECTOR))
      );
    });
    if (!rowsChanged || extractionTimer !== undefined) return;
    extractionTimer = setTimeout(() => {
      extractionTimer = undefined;
      extract();
    }, 100);
  });

  const connect = () => {
    const nextTarget = document.querySelector('#trade') || document.body;
    if (nextTarget === target) return;
    observer.disconnect();
    target = nextTarget;
    if (target) {
      // Attribute and autocomplete changes do not create selected stat rows.
      observer.observe(target, { childList: true, subtree: true });
      log(`Observing ${target === document.body ? 'body' : '#trade'}`);
    }
  };

  connect();
  extract();
  // Vue attaches and reuses its filter objects without a DOM mutation.
  // This single scoped backup also handles #trade appearing or being replaced.
  const backupTimer = setInterval(() => {
    connect();
    extract();
  }, 500);
  log('Initialized');

  return {
    extract,
    disconnect() {
      observer.disconnect();
      clearTimeout(extractionTimer);
      clearInterval(backupTimer);
    },
  };
}
