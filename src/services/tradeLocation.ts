// Trade location parsing and tracking
// Based on better-trading's implementation

import type { TradeLocationStruct, TradeSiteVersion } from "@/types/tradeLocation";

// Realms that have an extra path segment (poe2, xbox, sony)
const TRADE_REALMS = ["xbox", "sony", "poe2"];

export function parseTradeLocation(url: string): TradeLocationStruct {
  const urlObj = new URL(url);
  const pathParts = urlObj.pathname.split("/").filter(Boolean);

  // pathParts for /trade2/search/poe2/Standard/ABC123 = ['trade2', 'search', 'poe2', 'Standard', 'ABC123']
  const [versionPart, type, ...rest] = pathParts;

  const version: TradeSiteVersion = versionPart === "trade2" ? "2" : "1";

  let league: string | null = null;
  let slug: string | null = null;

  // Check if third segment is a realm (poe2, xbox, sony)
  if (rest[0] && TRADE_REALMS.includes(rest[0])) {
    // Format: /trade2/search/poe2/LeagueName/slug
    const [realm, leagueInRealm, searchSlug] = rest;
    league = realm && leagueInRealm ? `${realm}/${leagueInRealm}` : null;
    slug = searchSlug || null;
  } else {
    // Format: /trade/search/LeagueName/slug (PoE 1)
    const [leagueName, searchSlug] = rest;
    league = leagueName || null;
    slug = searchSlug || null;
  }

  return {
    version,
    type: type || null,
    league,
    slug,
  };
}

export function buildTradeUrl(location: TradeLocationStruct): string {
  const base = "https://www.pathofexile.com";
  const tradePath = location.version === "2" ? "trade2" : "trade";

  if (!location.type || !location.league) {
    return `${base}/${tradePath}`;
  }

  // League can be "poe2/Standard" or just "Standard"
  // Join the parts: [base, tradePath, type, league, slug]
  const parts = [base, tradePath, location.type, location.league];
  if (location.slug) {
    parts.push(location.slug);
  }

  return parts.join("/");
}

export function compareTradeLocations(
  a: TradeLocationStruct,
  b: TradeLocationStruct
): boolean {
  return (
    a.version === b.version &&
    a.type === b.type &&
    a.league === b.league &&
    a.slug === b.slug
  );
}

export function getCurrentTradeLocation(): TradeLocationStruct {
  return parseTradeLocation(window.location.href);
}

/**
 * Build the API URL for posting a search query.
 * Example: https://www.pathofexile.com/api/trade2/search/poe2/Standard
 */
export function buildTradeApiUrl(location: TradeLocationStruct): string {
  const tradePath = location.version === "2" ? "trade2" : "trade";
  return `https://www.pathofexile.com/api/${tradePath}/search/${location.league}`;
}
