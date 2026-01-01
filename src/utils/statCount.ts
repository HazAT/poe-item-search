import type { TradeSearchQuery } from "@/types/tradeLocation";

/**
 * Count the number of individual stat filters in a query payload.
 * Returns null if no stats are present.
 */
export function getStatCount(queryPayload?: TradeSearchQuery): number | null {
  if (!queryPayload?.query?.stats) return null;

  let count = 0;
  for (const group of queryPayload.query.stats) {
    if (group.filters) {
      // Only count non-disabled filters
      count += group.filters.filter((f) => !f.disabled).length;
    }
  }

  return count > 0 ? count : null;
}
