/**
 * PoE Item Search - Agent Capability
 *
 * This module exports a function that takes a copied PoE item text
 * and returns a search query for the PoE trade API.
 *
 * Usage:
 *   import { buildSearchQuery } from './search.js';
 *   const query = await buildSearchQuery(itemText);
 */

import { getSearchQuery, matchUniqueItem } from "./item.js";
import { addRegexToStats } from "./stat.js";

// Cache for stats data
let cachedStats = null;
let cacheTimestamp = 0;
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

/**
 * Fetches stats from the PoE trade API
 * @param {string} league - The league to fetch stats for (default: "Standard")
 * @param {boolean} poe2 - Whether to use PoE 2 API (default: true)
 * @returns {Promise<object>} The stats data
 */
async function fetchStats(league = "Standard", poe2 = true) {
  const baseUrl = poe2
    ? "https://www.pathofexile.com/api/trade2/data/stats"
    : "https://www.pathofexile.com/api/trade/data/stats";

  const response = await fetch(baseUrl, {
    headers: {
      "User-Agent": "poe-item-search-agent/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch stats: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Gets stats data, using cache if available and not expired
 * @param {object} options - Options for fetching stats
 * @param {boolean} options.forceRefresh - Force refresh the cache
 * @param {boolean} options.poe2 - Use PoE 2 API (default: true)
 * @returns {Promise<object>} The stats data with regex patterns added
 */
async function getStats({ forceRefresh = false, poe2 = true } = {}) {
  const now = Date.now();

  if (!forceRefresh && cachedStats && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedStats;
  }

  const stats = await fetchStats("Standard", poe2);
  cachedStats = addRegexToStats(stats);
  cacheTimestamp = now;

  return cachedStats;
}

/**
 * Builds a search query from a copied PoE item text.
 * This is the main function to use as an agent capability.
 *
 * @param {string} itemText - The raw item text copied from the game (Ctrl+C on item)
 * @param {object} options - Optional configuration
 * @param {boolean} options.poe2 - Use PoE 2 API (default: true)
 * @param {boolean} options.forceRefresh - Force refresh stats cache (default: false)
 * @param {object} options.stats - Pre-loaded stats data (skips fetch if provided)
 * @returns {Promise<object>} The search query object ready for the trade API
 *
 * @example
 * const itemText = `Item Class: Rings
 * Rarity: Rare
 * Sol Band
 * Gold Ring
 * --------
 * +24% to Cold Resistance
 * +30 to maximum Life`;
 *
 * const query = await buildSearchQuery(itemText);
 * // Returns: { stats: [...], term: undefined }
 *
 * // Use with PoE trade API:
 * // POST https://www.pathofexile.com/api/trade2/search/Standard
 * // Body: { query: { stats: query.stats, term: query.term } }
 */
export async function buildSearchQuery(itemText, options = {}) {
  const { poe2 = true, forceRefresh = false, stats: providedStats } = options;

  if (!itemText || typeof itemText !== "string") {
    throw new Error("itemText must be a non-empty string");
  }

  // Get stats (from provided, cache, or fetch)
  let regexStats;
  if (providedStats) {
    regexStats = providedStats.result ? addRegexToStats(providedStats) : providedStats;
  } else {
    regexStats = await getStats({ forceRefresh, poe2 });
  }

  // Build the search query
  const query = getSearchQuery(itemText, regexStats);

  return query;
}

/**
 * Checks if an item is unique and returns its name
 * @param {string} itemText - The raw item text
 * @returns {string|undefined} The unique item name, or undefined if not unique
 */
export function getUniqueItemName(itemText) {
  return matchUniqueItem(itemText);
}

/**
 * Builds a complete trade API request body
 * @param {string} itemText - The raw item text
 * @param {object} options - Options (same as buildSearchQuery)
 * @returns {Promise<object>} Complete request body for POST to trade API
 */
export async function buildTradeRequest(itemText, options = {}) {
  const query = await buildSearchQuery(itemText, options);

  return {
    query: {
      status: { option: "online" },
      stats: query.stats,
      ...(query.term && { term: query.term })
    },
    sort: { price: "asc" }
  };
}

/**
 * Clears the stats cache
 */
export function clearStatsCache() {
  cachedStats = null;
  cacheTimestamp = 0;
}

// Export for testing
export { getStats, fetchStats };
