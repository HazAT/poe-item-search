// src/services/tierData.ts
import tiersData from '../data/tiers.json';

interface TierInfo {
  tier: number;
  name: string;
  min: number | number[];
  max: number | number[];
  avgMin: number;
  ilvl: number;
}

interface StatTiers {
  text: string;
  tiers: Record<string, TierInfo[]>;
}

type TiersData = Record<string, StatTiers>;

const tiers: TiersData = tiersData as TiersData;

/**
 * Get tier data for a stat, optionally filtered by item class
 */
export function getTiersForStat(statId: string, itemClass?: string): TierInfo[] | null {
  const statTiers = tiers[statId];
  if (!statTiers) return null;

  if (itemClass && statTiers.tiers[itemClass]) {
    return statTiers.tiers[itemClass];
  }

  // Return first available item class if no specific one requested
  const firstClass = Object.keys(statTiers.tiers)[0];
  return firstClass ? statTiers.tiers[firstClass] : null;
}

/**
 * Check if we have tier data for a stat
 */
export function hasStatTiers(statId: string): boolean {
  return statId in tiers;
}

/**
 * Get the display text for a stat
 */
export function getStatText(statId: string): string | null {
  return tiers[statId]?.text ?? null;
}

/**
 * Get all item classes that have tiers for a stat
 */
export function getItemClassesForStat(statId: string): string[] {
  const statTiers = tiers[statId];
  if (!statTiers) return [];
  return Object.keys(statTiers.tiers);
}

/**
 * Find which tier a value falls into for a given stat
 * Uses range-based matching: value >= tierN.avgMin && value < tier(N-1).avgMin
 * Returns tier number if found, null if value doesn't fall in any tier range
 */
export function findTierForValue(statId: string, value: number, itemClass?: string): number | null {
  const tierList = getTiersForStat(statId, itemClass);
  if (!tierList || tierList.length === 0) return null;

  // Tiers are ordered T1 (highest avgMin) to Tn (lowest avgMin)
  // Find the tier where value >= avgMin
  for (const tier of tierList) {
    if (value >= tier.avgMin) {
      return tier.tier;
    }
  }

  // Value is below all tier ranges
  return null;
}
