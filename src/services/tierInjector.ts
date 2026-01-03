// src/services/tierInjector.ts
import { getTiersForStat, hasStatTiers } from './tierData';

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
 * Inject tier dropdowns into stat filters that we have tier data for
 */
export function injectTierDropdowns(): void {
  const filters = findStatFilters();
  const itemClass = getCurrentItemClass();

  console.log('[TierInjector] Found', filters.length, 'stat filters, item class:', itemClass);

  filters.forEach(filter => {
    // Skip if already has tier dropdown
    if (filter.querySelector('.tier-dropdown-injected')) return;

    const statId = getStatIdFromFilter(filter);
    if (!statId || !hasStatTiers(statId)) return;

    const tiers = getTiersForStat(statId, itemClass || undefined);
    if (!tiers || tiers.length === 0) return;

    const minInput = filter.querySelector('input[placeholder="min"]');
    if (!minInput) return;

    // Create tier dropdown container
    const container = document.createElement('span');
    container.className = 'tier-dropdown-injected';
    container.style.marginLeft = '4px';

    // TODO: Render TierDropdown React component into container
    // For now, just add a placeholder button
    container.innerHTML = `<button style="padding: 2px 6px; font-size: 11px; background: #1a1a1d; border: 1px solid #3d3d3d; color: #c8b68b; cursor: pointer;" title="T1: ${tiers[0].name} (${tiers[0].avgMin}+)">T&#9662;</button>`;

    minInput.after(container);

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
