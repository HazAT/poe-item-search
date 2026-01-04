// src/services/tierInjector.ts
import { createRoot, Root } from 'react-dom/client';
import { createElement } from 'react';
import { getTiersForStat, hasStatTiers, findTierForValue } from './tierData';
import { TierDropdown } from '@/components/tiers/TierDropdown';
import { getExtensionUrl } from '@/utils/extensionApi';
import { debug } from '@/utils/debug';

// Track React roots for cleanup
const tierDropdownRoots = new Map<HTMLElement, Root>();

/**
 * Inject a script into the main world to extract Vue stat IDs
 * and store them as data attributes on filter elements
 */
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

/**
 * Find the Stat Filters group element
 */
function findStatFiltersGroup(): Element | null {
  const filterGroups = document.querySelectorAll('.filter-group');
  for (const group of filterGroups) {
    const header = group.querySelector('.filter-title');
    if (header?.textContent?.includes('Stat Filters')) {
      return group;
    }
  }
  return null;
}

/**
 * Find all stat filter elements on the page
 */
function findStatFilters(): HTMLElement[] {
  const statFiltersGroup = findStatFiltersGroup();
  if (!statFiltersGroup) {
    debug.log('[TierInjector] findStatFilters: no group found');
    return [];
  }

  // Get all stat filter rows
  const filters = statFiltersGroup.querySelectorAll('.filter.full-span');
  debug.log('[TierInjector] findStatFilters: found', filters.length, 'in group');
  return Array.from(filters) as HTMLElement[];
}

/**
 * Get the stat ID from a filter element via data attribute
 * (set by injected main world script)
 */
function getStatIdFromFilter(filterElement: HTMLElement): string | null {
  return filterElement.dataset.statId || null;
}

/**
 * Get the current item class from the Type Filters
 */
function getCurrentItemClass(): string | null {
  // Find the Type Filters group (first filter group)
  const typeFilters = document.querySelector('.filter-group');
  const categorySelect = typeFilters?.querySelector('.multiselect__single');
  const text = categorySelect?.textContent?.trim();

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

/**
 * Update the min input value and dispatch events for Vue to pick up
 */
function updateMinInput(minInput: HTMLInputElement, value: number): void {
  // Set the value
  minInput.value = String(value);

  // Dispatch input event for Vue reactivity
  minInput.dispatchEvent(new Event('input', { bubbles: true }));

  // Also dispatch change event for good measure
  minInput.dispatchEvent(new Event('change', { bubbles: true }));

  debug.log('[TierInjector] Updated min input to', value);
}

/**
 * Check if any stat filter has stat ID extracted
 */
function hasStatIdsExtracted(): boolean {
  const filters = findStatFilters();
  if (filters.length === 0) return false;

  const hasIds = filters.some(filter => !!filter.dataset.statId);
  debug.log('[TierInjector] hasStatIdsExtracted:', hasIds, 'of', filters.length, 'filters');
  return hasIds;
}

/**
 * Inject tier dropdowns into stat filters that we have tier data for
 */
export function injectTierDropdowns(): void {
  debug.log('[TierInjector] injectTierDropdowns called');

  const statFiltersGroup = findStatFiltersGroup();
  debug.log('[TierInjector] Stat Filters group:', statFiltersGroup ? 'found' : 'NOT FOUND');

  if (!statFiltersGroup) return;

  const filters = findStatFilters();
  if (filters.length === 0) {
    debug.log('[TierInjector] No stat filters found');
    return;
  }

  // Check if stat IDs have been extracted yet
  if (!hasStatIdsExtracted()) {
    debug.log('[TierInjector] Stat IDs not extracted yet, will retry via observer');
    return;
  }

  const itemClass = getCurrentItemClass();
  debug.log('[TierInjector] Found', filters.length, 'stat filters, item class:', itemClass);

  filters.forEach(filter => {
    // Skip if already has tier dropdown
    if (filter.querySelector('.tier-dropdown-injected')) {
      debug.log('[TierInjector] Skipping filter - already has dropdown');
      return;
    }

    const statId = getStatIdFromFilter(filter);
    debug.log('[TierInjector] Processing filter, statId:', statId);

    if (!statId) {
      debug.log('[TierInjector] Skipping - no statId');
      return;
    }

    const hasTiers = hasStatTiers(statId);
    debug.log('[TierInjector] hasStatTiers:', hasTiers);

    if (!hasTiers) {
      debug.log('[TierInjector] Skipping - no tier data for', statId);
      return;
    }

    const tiers = getTiersForStat(statId, itemClass || undefined);
    debug.log('[TierInjector] Tiers for', statId, ':', tiers?.length || 0, 'tiers');

    if (!tiers || tiers.length === 0) {
      debug.log('[TierInjector] Skipping - no tiers available');
      return;
    }

    const minInput = filter.querySelector('input[placeholder="min"]') as HTMLInputElement | null;
    if (!minInput) {
      debug.log('[TierInjector] Skipping - no min input found');
      return;
    }

    // Create a wrapper around the min input for positioning
    const wrapper = document.createElement('span');
    wrapper.className = 'tier-input-wrapper';
    wrapper.style.cssText = 'position: relative; display: inline-block;';

    // Wrap the min input
    minInput.parentNode?.insertBefore(wrapper, minInput);
    wrapper.appendChild(minInput);

    // Create tier dropdown container positioned inside the wrapper
    const container = document.createElement('span');
    container.className = 'tier-dropdown-injected';
    container.style.cssText = 'position: absolute; right: 2px; top: 50%; transform: translateY(-50%); z-index: 5;';

    // Add padding to min input so text doesn't overlap with button
    minInput.style.paddingRight = '28px';

    wrapper.appendChild(container);

    // Function to render/re-render the dropdown with current value
    const renderDropdown = () => {
      const value = minInput.value ? parseFloat(minInput.value) : undefined;
      const currentTier = value !== undefined && !isNaN(value)
        ? findTierForValue(statId, value, itemClass || undefined)
        : null;

      const root = tierDropdownRoots.get(container) || createRoot(container);
      if (!tierDropdownRoots.has(container)) {
        tierDropdownRoots.set(container, root);
      }

      root.render(
        createElement(TierDropdown, {
          tiers,
          onSelect: (avgMin: number) => {
            updateMinInput(minInput, avgMin);
            // Re-render to update tier display after selection
            setTimeout(renderDropdown, 0);
          },
          containerElement: container,
          currentTier,
        })
      );
    };

    // Initial render
    renderDropdown();

    // Listen for input changes to update tier display
    minInput.addEventListener('input', renderDropdown);
    minInput.addEventListener('change', renderDropdown);

    debug.log('[TierInjector] Injected tier dropdown for', statId);
  });
}

/**
 * Observe for filter changes and inject dropdowns
 * Watches the #trade container to catch when filters are shown/hidden
 */
export function observeFilterChanges(): MutationObserver | null {
  // Watch the #trade container which always exists
  const tradeContainer = document.querySelector('#trade');
  if (!tradeContainer) {
    debug.log('[TierInjector] #trade container not found');
    return null;
  }

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const tryInjectWithRetry = () => {
    injectTierDropdowns();
    // If stat IDs weren't ready, retry a few times
    const filters = findStatFilters();
    if (filters.length > 0 && !hasStatIdsExtracted()) {
      let retries = 0;
      const retryInterval = setInterval(() => {
        retries++;
        if (hasStatIdsExtracted()) {
          clearInterval(retryInterval);
          debug.log('[TierInjector] Stat IDs extracted after', retries * 100, 'ms retry');
          injectTierDropdowns();
        } else if (retries >= 20) {
          clearInterval(retryInterval);
          debug.log('[TierInjector] Gave up waiting for stat IDs after 2s');
        }
      }, 100);
    }
  };

  const observer = new MutationObserver(() => {
    // Debounce to avoid excessive calls during DOM updates
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(tryInjectWithRetry, 100);
  });

  observer.observe(tradeContainer, { childList: true, subtree: true });
  debug.log('[TierInjector] Observing #trade for filter changes');

  // Also listen for custom event from stat ID extractor
  document.addEventListener('poe-stat-ids-extracted', (e) => {
    debug.log('[TierInjector] Received stat-ids-extracted event:', (e as CustomEvent).detail);
    injectTierDropdowns();
  });

  return observer;
}
