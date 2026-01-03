// src/services/tierInjector.ts
import { createRoot, Root } from 'react-dom/client';
import { createElement } from 'react';
import { getTiersForStat, hasStatTiers } from './tierData';
import { TierDropdown } from '@/components/tiers/TierDropdown';

// Track React roots for cleanup
const tierDropdownRoots = new Map<HTMLElement, Root>();

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
  if (!statFiltersGroup) return [];

  // Get all stat filter rows
  const filters = statFiltersGroup.querySelectorAll('.filter.full-span');
  return Array.from(filters) as HTMLElement[];
}

/**
 * Get the stat ID from a filter element via Vue component data
 */
function getStatIdFromFilter(filterElement: HTMLElement): string | null {
  const vue = (filterElement as any).__vue__;
  return vue?.$props?.filter?.id || vue?.$data?.lastMutable?.id || null;
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

  console.log('[TierInjector] Updated min input to', value);
}

/**
 * Inject tier dropdowns into stat filters that we have tier data for
 */
export function injectTierDropdowns(): void {
  console.log('[TierInjector] injectTierDropdowns called');

  const statFiltersGroup = findStatFiltersGroup();
  console.log('[TierInjector] Stat Filters group:', statFiltersGroup ? 'found' : 'NOT FOUND');

  const filters = findStatFilters();
  const itemClass = getCurrentItemClass();

  console.log('[TierInjector] Found', filters.length, 'stat filters, item class:', itemClass);

  filters.forEach(filter => {
    // Skip if already has tier dropdown
    if (filter.querySelector('.tier-dropdown-injected')) {
      console.log('[TierInjector] Skipping filter - already has dropdown');
      return;
    }

    const statId = getStatIdFromFilter(filter);
    console.log('[TierInjector] Processing filter, statId:', statId);

    if (!statId) {
      console.log('[TierInjector] Skipping - no statId');
      return;
    }

    const hasTiers = hasStatTiers(statId);
    console.log('[TierInjector] hasStatTiers:', hasTiers);

    if (!hasTiers) {
      console.log('[TierInjector] Skipping - no tier data for', statId);
      return;
    }

    const tiers = getTiersForStat(statId, itemClass || undefined);
    console.log('[TierInjector] Tiers for', statId, ':', tiers?.length || 0, 'tiers');

    if (!tiers || tiers.length === 0) {
      console.log('[TierInjector] Skipping - no tiers available');
      return;
    }

    const minInput = filter.querySelector('input[placeholder="min"]') as HTMLInputElement | null;
    if (!minInput) {
      console.log('[TierInjector] Skipping - no min input found');
      return;
    }

    // Create tier dropdown container
    const container = document.createElement('span');
    container.className = 'tier-dropdown-injected';

    minInput.after(container);

    // Render TierDropdown React component
    const root = createRoot(container);
    root.render(
      createElement(TierDropdown, {
        tiers,
        onSelect: (avgMin: number) => {
          updateMinInput(minInput, avgMin);
        },
      })
    );

    // Track root for cleanup
    tierDropdownRoots.set(container, root);

    console.log('[TierInjector] Injected tier dropdown for', statId);
  });
}

/**
 * Observe for new stat filters being added and inject dropdowns
 */
export function observeFilterChanges(): MutationObserver | null {
  const statFiltersGroup = findStatFiltersGroup();

  if (!statFiltersGroup) {
    console.log('[TierInjector] Stat Filters group not found');
    return null;
  }

  const observer = new MutationObserver(() => {
    // Re-inject dropdowns when filters change
    injectTierDropdowns();
  });

  observer.observe(statFiltersGroup, { childList: true, subtree: true });
  console.log('[TierInjector] Observing filter changes');

  return observer;
}
