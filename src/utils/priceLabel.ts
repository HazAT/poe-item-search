// Utility to extract and format price filter info from trade queries

import type { TradeSearchQuery } from "@/types/tradeLocation";

export interface PriceLabelResult {
  max: number;
  currency: string;
}

// Currency abbreviations for common PoE currencies
const CURRENCY_ABBREVIATIONS: Record<string, string> = {
  exalted: "ex",
  chaos: "c",
  divine: "div",
  mirror: "mir",
  vaal: "vaal",
  regal: "regal",
  blessed: "blessed",
  jeweller: "jew",
  fusing: "fus",
  chromatic: "chrom",
  alteration: "alt",
  chance: "chance",
  alchemy: "alch",
  scouring: "scour",
  regret: "regret",
  gemcutter: "gcp",
  chisel: "chisel",
};

/**
 * Extract max price info from a trade query payload.
 * Returns null if no max price is defined.
 */
export function getPriceLabel(queryPayload?: TradeSearchQuery): PriceLabelResult | null {
  if (!queryPayload?.query?.filters) return null;

  // Navigate to price filter: query.filters.trade_filters.filters.price
  const filters = queryPayload.query.filters as Record<string, unknown>;
  const tradeFilters = filters.trade_filters as Record<string, unknown> | undefined;
  if (!tradeFilters) return null;

  const innerFilters = tradeFilters.filters as Record<string, unknown> | undefined;
  if (!innerFilters) return null;

  const price = innerFilters.price as { min?: number; max?: number; option?: string } | undefined;
  if (!price || price.max === undefined) return null;

  return {
    max: price.max,
    currency: price.option || "chaos", // Default to chaos if not specified
  };
}

/**
 * Format price info as a badge string.
 * Example: { max: 200, currency: "exalted" } -> "≤200ex"
 */
export function formatPriceBadge(result: PriceLabelResult): string {
  const abbrev = CURRENCY_ABBREVIATIONS[result.currency] || result.currency.slice(0, 3);
  return `≤${result.max}${abbrev}`;
}
