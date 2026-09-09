import { createRoot, type Root } from 'react-dom/client';
import { createElement } from 'react';
import { getTiersForStat, hasStatTiers, findTierForValue } from './tierData';
import { TierDropdown } from '@/components/tiers/TierDropdown';
import { getExtensionUrl } from '@/utils/extensionApi';
import { debug } from '@/utils/debug';

const FILTER_SELECTOR = '.filter.full-span';
const CATEGORY_SELECTOR = '.filter-property[data-stat-id="category"]';
const IGNORED_SELECTOR = '.multiselect__content-wrapper, .results, .tier-dropdown-injected';

interface TierControl {
  statId: string;
  itemClass: string | null;
  input: HTMLInputElement;
  wrapper: HTMLElement;
  container: HTMLElement;
  root: Root;
  render: () => void;
  originalPadding: string;
}

const tierControls = new Map<HTMLElement, TierControl>();

export function injectStatIdExtractor(): void {
  debug.log('[TierInjector] injectStatIdExtractor called');
  const scriptUrl = getExtensionUrl('statIdExtractor.js');
  debug.log('[TierInjector] statIdExtractor URL:', scriptUrl);
  if (!scriptUrl) {
    debug.warn('[TierInjector] Cannot inject stat ID extractor: not in extension context');
    return;
  }

  const script = document.createElement('script');
  script.src = scriptUrl;
  script.onload = () => {
    debug.log('[TierInjector] Stat ID extractor script injected');
    script.remove();
  };
  script.onerror = (e) => {
    debug.error('[TierInjector] Failed to inject stat ID extractor. URL was:', scriptUrl, 'Error:', e);
  };
  (document.head || document.documentElement).appendChild(script);
}

function findStatFilters(): HTMLElement[] {
  for (const group of document.querySelectorAll('.filter-group')) {
    if (group.querySelector('.filter-title')?.textContent?.includes('Stat Filters')) {
      return Array.from(group.querySelectorAll<HTMLElement>(FILTER_SELECTOR));
    }
  }
  return [];
}

function getCurrentItemClass(): string | null {
  // Find the category filter in the Type Filters group
  const categoryFilter = document.querySelector('.filter-property[data-stat-id="category"]');
  if (!categoryFilter) return null;

  // The selected category is in the multiselect input's placeholder attribute
  const categoryInput = categoryFilter.querySelector('.multiselect__input') as HTMLInputElement | null;
  const text = categoryInput?.placeholder?.trim();

  // Map common categories to our tier data item classes
  if (text?.includes('Gloves')) return 'Gloves';
  if (text?.includes('Boots')) return 'Boots';
  if (text?.includes('Body Armour')) return 'Body Armours';
  if (text?.includes('Helmet')) return 'Helmets';
  if (text?.includes('Ring')) return 'Rings';
  if (text?.includes('Amulet')) return 'Amulets';
  if (text?.includes('Belt')) return 'Belts';
  if (text?.includes('Quiver')) return 'Quivers';

  return null;
}

function removeControl(filter: HTMLElement, control: TierControl): void {
  control.input.removeEventListener('input', control.render);
  control.input.removeEventListener('change', control.render);
  control.root.unmount();
  control.container.remove();
  // Vue may have replaced the min input while our wrapper was mounted.
  control.wrapper.replaceWith(...control.wrapper.childNodes);
  control.input.style.paddingRight = control.originalPadding;
  tierControls.delete(filter);
  debug.log('[TierInjector] Removed tier dropdown for', control.statId);
}

// Returns whether a selected row's Vue ID is still being initialized.
function syncTierDropdowns(): boolean {
  const filters = findStatFilters();
  const currentFilters = new Set(filters);
  for (const [filter, control] of tierControls) {
    if (!currentFilters.has(filter) || !filter.contains(control.input) || !filter.contains(control.container)) {
      removeControl(filter, control);
    }
  }

  const itemClass = getCurrentItemClass();
  let waitingForIds = false;
  for (const filter of filters) {
    const statId = filter.dataset.statId;
    const input = filter.querySelector<HTMLInputElement>('input[placeholder="min"]');
    const existing = tierControls.get(filter);
    if (existing && existing.statId === statId && existing.itemClass === itemClass && existing.input === input) {
      existing.render();
      continue;
    }
    if (existing) removeControl(filter, existing);
    if (!input) continue;
    if (!statId) {
      waitingForIds = true;
      continue;
    }
    if (!hasStatTiers(statId)) continue;
    const tiers = getTiersForStat(statId, itemClass || undefined);
    if (!tiers?.length) continue;

    const wrapper = document.createElement('span');
    wrapper.className = 'tier-input-wrapper';
    wrapper.style.cssText = 'position: relative; display: inline-block;';
    input.parentNode?.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    const container = document.createElement('span');
    container.className = 'tier-dropdown-injected';
    container.style.cssText = 'position: absolute; right: 2px; top: 50%; transform: translateY(-50%); z-index: 5;';
    wrapper.appendChild(container);
    const originalPadding = input.style.paddingRight;
    input.style.paddingRight = '28px';
    const root = createRoot(container);
    let renderedTier: number | null | undefined;
    const render = () => {
      const value = input.value ? parseFloat(input.value) : NaN;
      const currentTier = Number.isFinite(value) ? findTierForValue(statId, value, itemClass || undefined) : null;
      if (currentTier === renderedTier) return;
      renderedTier = currentTier;
      root.render(createElement(TierDropdown, {
        tiers,
        onSelect: (avgMin: number) => {
          input.value = String(avgMin);
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          debug.log('[TierInjector] Updated min input to', avgMin);
        },
        containerElement: container,
        currentTier,
      }));
    };

    tierControls.set(filter, { statId, itemClass, input, wrapper, container, root, render, originalPadding });
    input.addEventListener('input', render);
    input.addEventListener('change', render);
    render();
    debug.log('[TierInjector] Injected tier dropdown for', statId);
  }
  return waitingForIds;
}

export function injectTierDropdowns(): void {
  syncTierDropdowns();
}

function isRelevantMutation(record: MutationRecord): boolean {
  const target = record.target instanceof Element ? record.target : null;
  if (target?.closest(IGNORED_SELECTOR)) return false;
  if (record.type === 'attributes') {
    return record.attributeName === 'data-stat-id' && !!target?.matches(FILTER_SELECTOR) ||
      record.attributeName === 'placeholder' && !!target?.closest(CATEGORY_SELECTOR);
  }

  return [...record.addedNodes, ...record.removedNodes].some(node => {
    if (!(node instanceof Element) || node.matches(IGNORED_SELECTOR + ', .tier-input-wrapper')) return false;
    // Moving our existing input into its wrapper is not a new host-page input.
    if ([...tierControls.values()].some(control => control.input === node && node.parentElement === control.wrapper)) return false;
    if (node.matches(FILTER_SELECTOR + ', ' + CATEGORY_SELECTOR) || node.querySelector(FILTER_SELECTOR + ', ' + CATEGORY_SELECTOR)) return true;
    return !!target?.closest(FILTER_SELECTOR) &&
      (node.matches('input[placeholder="min"]') || !!node.querySelector('input[placeholder="min"]'));
  });
}

export function observeFilterChanges(): Pick<MutationObserver, 'disconnect'> | null {
  const tradeContainer = document.querySelector('#trade');
  if (!tradeContainer) {
    debug.log('[TierInjector] #trade container not found');
    return null;
  }

  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let retryInterval: ReturnType<typeof setInterval> | undefined;
  const clearRetry = () => {
    clearInterval(retryInterval);
    retryInterval = undefined;
  };
  const synchronize = () => {
    debounceTimer = undefined;
    const waiting = syncTierDropdowns();
    if (!waiting || retryInterval !== undefined) return;
    let retries = 0;
    retryInterval = setInterval(() => {
      retries++;
      const stillWaiting = syncTierDropdowns();
      if (!stillWaiting || retries >= 20) {
        clearRetry();
        debug.log(stillWaiting ? '[TierInjector] Gave up waiting for stat IDs after 2s' : '[TierInjector] Stat IDs ready');
      }
    }, 100);
  };
  const schedule = () => {
    clearRetry();
    if (debounceTimer === undefined) debounceTimer = setTimeout(synchronize, 100);
  };

  const observer = new MutationObserver(records => {
    if (records.some(isRelevantMutation)) schedule();
  });
  observer.observe(tradeContainer, {
    childList: true, subtree: true, attributes: true, attributeFilter: ['data-stat-id', 'placeholder'],
  });
  const onStatIds = () => {
    debug.log('[TierInjector] Received stat-ids-extracted event');
    schedule();
  };
  document.addEventListener('poe-stat-ids-extracted', onStatIds);
  synchronize();
  debug.log('[TierInjector] Observing #trade for selected stat changes');

  return {
    disconnect() {
      observer.disconnect();
      clearTimeout(debounceTimer);
      clearRetry();
      document.removeEventListener('poe-stat-ids-extracted', onStatIds);
      for (const [filter, control] of tierControls) removeControl(filter, control);
    },
  };
}
